/* jittertrap-core.js */

/* global CBuffer */
/* global JT:true */

JT = (function (my) {
  'use strict';

  /* module namespace */
  my.core = {};

  var samplePeriod = JT.coreconfig.samplePeriod;

  /* data sample period; microseconds; fixed. */
  my.core.samplePeriod = function(sp) {
    if (sp) {
      console.log("sample period set to " + sp + " microseconds");
      samplePeriod = sp;
    }
    return samplePeriod;
  };

  /* number of data samples. */
  var sampleCount = 200;

  my.core.sampleCount = function () {
    return sampleCount;
  };

  /* count must be bytes, samplePeriod is microseconds */
  var byteCountToKbpsRate = function(count) {
    var rate = count / my.core.samplePeriod() * 8000.0 * (my.core.samplePeriod() / 1000);
    return rate;
  };

  var packetDeltaToRate = function(count) {
    return count * (1000000.0 / my.core.samplePeriod()) * (my.core.samplePeriod() / 1000);
  };

  var timeScaleTable = { "50ms": 50, "100ms": 100, "200ms": 200 };

  /* a prototype object to encapsulate timeseries data. */
  var Series = function(name, title, ylabel, rateFormatter) {
    this.name = name;
    this.title = title;
    this.ylabel = ylabel;
    this.rateFormatter = rateFormatter;
    this.xlabel = "Time (ms)";
    this.stats = {min: 99999, max:0, median:0, mean:0, maxPG:0, meanPG:0 };
    this.samples = { '50ms': [], '100ms':[], '200ms':[] };
    this.pgaps = {};
    for (var ts in timeScaleTable) {
      this.pgaps[ts] = new CBuffer(200);
    }
 };


  var sBin = {};  // a container (Bin) for series.
  sBin.rxRate = new Series("rxRate",
                           "Ingress Bitrate in kbps",
                           "kbps, mean",
                           byteCountToKbpsRate);

  sBin.txRate = new Series("txRate",
                           "Egress Bitrate in kbps",
                           "kbps, mean",
                           byteCountToKbpsRate);

  sBin.txPacketRate = new Series("txPacketRate",
                                 "Egress packet rate",
                                 "pkts per sec, mean",
                                 packetDeltaToRate);

  sBin.rxPacketRate = new Series("rxPacketRate",
                                 "Ingress packet rate",
                                 "pkts per sec, mean",
                                 packetDeltaToRate);

  var selectedSeriesName = "rxRate";

  my.core.setSelectedSeriesName = function(sName) {
    selectedSeriesName = sName;
  };

  my.core.getSelectedSeries = function () {
    return sBin[selectedSeriesName];
  };

  var resizeCBuf = function(series, len) {

    if (len === sampleCount) {
      return;
    }

    for (var key in timeScaleTable) {
      var b = new CBuffer(len);
      var l = (len < series.samples[key].size) ? len : series.samples[key].size;
      while (l--) {
        b.push(series.samples[key].shift());
      }
      series.samples[key] = b;
      series.pgaps[key] = new CBuffer(len);
    }
  };

  my.core.resizeDataBufs = function(newlen) {

    resizeCBuf(sBin.rxRate, newlen);
    resizeCBuf(sBin.txRate, newlen);

    resizeCBuf(sBin.txPacketRate, newlen);
    resizeCBuf(sBin.rxPacketRate, newlen);

  };

  var clearSeries = function (s) {

    for (var key in timeScaleTable) {
      s.samples[key] = new CBuffer(200);
      s.pgaps[key].empty();
    }

  };

  my.core.clearAllSeries = function () {
    clearSeries(sBin.txRate);
    clearSeries(sBin.rxRate);
    clearSeries(sBin.txPacketRate);
    clearSeries(sBin.rxPacketRate);
  };

  var numSort = function(a,b) {
    return (a - b)|0;
  };

  var updateBasicStatsChartData = function (stats, chartSeries) {
    if (chartSeries[0]) {
      chartSeries[0].y = stats.min;
      chartSeries[1].y = stats.median;
      chartSeries[2].y = stats.mean;
      chartSeries[3].y = stats.max;
    } else {
      chartSeries.push({x:1, y:stats.min, label:"Min"});
      chartSeries.push({x:2, y:stats.median, label:"Median"});
      chartSeries.push({x:3, y:stats.mean, label:"Mean"});
      chartSeries.push({x:4, y:stats.max, label:"Max"});
    }
  };

  var updatePacketGapChartData = function (data, mean, minMax) {

    var chartPeriod = my.charts.getChartPeriod();
    var len = data.size;

    mean.length = 0;
    minMax.length = 0;

    for (var i = 0; i < len; i++) {
      var x = i * chartPeriod;
      var pg = data.get(i);
      mean.push({x: x, y: pg.mean});
      minMax.push({x: x, y: [pg.min, pg.max]});
      //console.log(x + " " + pg.min + " " + pg.max);
    }
  };

  var updateStats = function (series, timeScale) {
    var sortedData = series.samples[timeScale].slice(0);
    series.stats.cur = sortedData[sortedData.length-1];
    sortedData.sort(numSort);

    series.stats.max = sortedData[sortedData.length-1];
    series.stats.min = sortedData[0];
    series.stats.median = sortedData[Math.floor(sortedData.length / 2.0)];
    var sum = 0;
    var i = 0;

    for (i = sortedData.length-1; i >=0; i--) {
      sum += sortedData[i];
    }
    series.stats.mean = sum / sortedData.length;

    var pg = series.pgaps[timeScale].last();
    series.stats.maxPG = 1.0 * pg.max;
    series.stats.meanPG = 1.0 * pg.mean;

  };

  var updateMainChartData = function(samples, formatter, chartSeries) {
    var chartPeriod = my.charts.getChartPeriod();
    var len = samples.size;

    chartSeries.length = 0;

    for (var i = 0; i < len; i++) {
      chartSeries.push({timestamp: i*chartPeriod, value: samples.get(i)});
    }
  };

  var updateSeries = function (series, yVal, selectedSeries, timeScale) {
    series.samples[timeScale].push(yVal);

    if (my.charts.getChartPeriod() == timeScaleTable[timeScale]) {
      updateStats(series, timeScale);
      JT.measurementsModule.updateSeries(series.name, series.stats);
      JT.trapModule.checkTriggers(series.name, series.stats);

      /* update the charts data */
      if (series.name === selectedSeries.name) {
        updateMainChartData(series.samples[timeScale],
                            series.rateFormatter,
                            JT.charts.getMainChartRef());

        updatePacketGapChartData(series.pgaps[timeScale],
                                 JT.charts.getPacketGapMeanRef(),
                                 JT.charts.getPacketGapMinMaxRef());
      }
    }

  };

  var updateData = function (d, sSeries, timeScale) {
    sBin.rxRate.pgaps[timeScale].push(
      {
        "min"  : d.min_rx_pgap,
        "max"  : d.max_rx_pgap,
        "mean" : d.mean_rx_pgap / 1000.0
      }
    );

    sBin.txRate.pgaps[timeScale].push(
      {
        "min"  : d.min_tx_pgap,
        "max"  : d.max_tx_pgap,
        "mean" : d.mean_tx_pgap / 1000.0
      }
    );

    sBin.rxPacketRate.pgaps[timeScale].push(
      {
        "min"  : d.min_rx_pgap,
        "max"  : d.max_rx_pgap,
        "mean" : d.mean_rx_pgap / 1000.0
      }
    );

    sBin.txPacketRate.pgaps[timeScale].push(
      {
        "min"  : d.min_tx_pgap,
        "max"  : d.max_tx_pgap,
        "mean" : d.mean_tx_pgap / 1000.0
      }
    );

    updateSeries(sBin.txRate, byteCountToKbpsRate(d.tx / 1000.0), sSeries, timeScale);
    updateSeries(sBin.rxRate, byteCountToKbpsRate(d.rx / 1000.0), sSeries, timeScale);
    updateSeries(sBin.txPacketRate, packetDeltaToRate(d.txP / 1000.0), sSeries, timeScale);
    updateSeries(sBin.rxPacketRate, packetDeltaToRate(d.rxP / 1000.0), sSeries, timeScale);
  };

  my.core.processDataMsg = function (stats, interval) {
    var selectedSeries = sBin[selectedSeriesName];

    switch (interval) {
      case 50000000:
           updateData(stats, selectedSeries, '50ms');
           break;
      case 100000000:
           updateData(stats, selectedSeries, '100ms');
           break;
      case 200000000:
           updateData(stats, selectedSeries, '200ms');
           break;
      default:
           console.log("unknown interval: " + interval);
    }
  };

  my.core.processTopTalkMsg = function (msg) {
    var interval = msg.interval_ns;
    var d = new Date();

    switch (interval) {
      case 50000000:
           break;
      case 100000000:
           break;
      case 200000000:
           break;
      default:
           console.log("unknown interval: " + interval);
    }
  };

  return my;
}(JT));
/* End of jittertrap-core.js */
