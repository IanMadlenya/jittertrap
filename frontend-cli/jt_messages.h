#ifndef JT_MESSAGES_H
#define JT_MESSAGES_H

#include "jt_message_types.h"

#include "jt_msg_stats.h"
#include "jt_msg_list_ifaces.h"
#include "jt_msg_select_iface.h"
#include "jt_msg_netem_params.h"
#include "jt_msg_sample_period.h"
#include "jt_msg_get_netem.h"
#include "jt_msg_set_netem.h"

static const struct jt_msg_type jt_messages[] =
    {[JT_MSG_STATS_V1] = { .type = JT_MSG_STATS_V1,
		           .key = "stats",
		           .unpack = jt_stats_unpacker,
		           .pack = jt_stats_packer,
		           .consume = jt_stats_consumer,
		           .get_test_msg = jt_stats_test_msg_get },

     [JT_MSG_IFACE_LIST_V1] = { .type = JT_MSG_IFACE_LIST_V1,
		                .key = "ifaces",
		                .unpack = jt_iface_list_unpacker,
		                .pack = jt_iface_list_packer,
		                .consume = jt_iface_list_consumer,
		                .get_test_msg = jt_iface_list_test_msg_get },

     [JT_MSG_SELECT_IFACE_V1] = { .type = JT_MSG_SELECT_IFACE_V1,
		                  .key = "dev_select",
		                  .unpack = jt_select_iface_unpacker,
		                  .pack = jt_select_iface_packer,
		                  .consume = jt_select_iface_consumer,
		                  .get_test_msg =
		                      jt_select_iface_test_msg_get },

     [JT_MSG_NETEM_PARAMS_V1] = { .type = JT_MSG_NETEM_PARAMS_V1,
		                  .key = "netem_params",
		                  .unpack = jt_netem_params_unpacker,
		                  .pack = jt_netem_params_packer,
		                  .consume = jt_netem_params_consumer,
		                  .get_test_msg =
		                      jt_netem_params_test_msg_get },

     [JT_MSG_SAMPLE_PERIOD_V1] = { .type = JT_MSG_SAMPLE_PERIOD_V1,
		                   .key = "sample_period",
		                   .unpack = jt_sample_period_unpacker,
		                   .pack = jt_sample_period_packer,
		                   .consume = jt_sample_period_consumer,
		                   .get_test_msg = jt_sample_period_msg_get },

     [JT_MSG_GET_NETEM_V1] = { .type = JT_MSG_GET_NETEM_V1,
		               .key = "get_netem",
		               .unpack = jt_get_netem_unpacker,
		               .pack = jt_get_netem_packer,
		               .consume = jt_get_netem_consumer,
		               .get_test_msg = jt_get_netem_test_msg_get },

     [JT_MSG_SET_NETEM_V1] = { .type = JT_MSG_SET_NETEM_V1,
		               .key = "set_netem",
		               .unpack = jt_set_netem_unpacker,
		               .pack = jt_set_netem_packer,
		               .consume = jt_set_netem_consumer,
		               .get_test_msg = jt_set_netem_test_msg_get },

     [JT_MSG_END] = {
	     .type = JT_MSG_END, .key = NULL, .unpack = NULL, .consume = NULL
     } };

/* handle messages received from server in client */
int jt_client_msg_handler(char *input);

/* handle messages received from client in server */
int jt_server_msg_handler(char *in);

#endif
