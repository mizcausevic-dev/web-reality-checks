// Episode 06 fixture: DETERMINISTIC MOCK MODEL. No network, no real model API.
//
// Every response from this module is a SIMULATED MODEL RESPONSE. It imitates only the
// observable shape of a tool-using model API: given messages + tool definitions it returns
// either a structured tool call or a final text message. It has no hidden reasoning and
// exposes none; it is a lookup over the conversation state.
//
//   turn 1 (no tool result in messages)  -> {type:'tool_call', name:'countTickets', args:{status:'open', priority:'high'}}
//   turn 2 (a tool_result is present)    -> {type:'text', text:'There are N open high-priority tickets ...'} with N copied
//                                           verbatim from the tool_result content. The mock never invents N.
//
// `variant` lets tests exercise misbehaving model output:
//   'smuggle_scope' -> tool call carries an extra accountId the model is not allowed to choose
//   'unknown_tool'  -> asks for a tool that was never offered
//   'bad_args'      -> wrong enum value

export const makeMockModel = ({variant = 'normal'} = {}) => {
  const model = async ({messages, tools}) => {
    model.calls++;
    const toolResult = messages.find((m) => m.role === 'tool');
    if (!toolResult) {
      const offered = tools.map((t) => t.name);
      if (variant === 'unknown_tool') return {type: 'tool_call', callId: 'call_1', name: 'runSql', args: {sql: 'SELECT count(*) FROM tickets'}};
      if (variant === 'bad_args') return {type: 'tool_call', callId: 'call_1', name: 'countTickets', args: {status: 'open', priority: 'urgent'}};
      if (variant === 'smuggle_scope') return {type: 'tool_call', callId: 'call_1', name: 'countTickets', args: {status: 'open', priority: 'high', accountId: 'org_globex'}};
      if (!offered.includes('countTickets')) return {type: 'text', text: 'I do not have a tool to count tickets.'};
      return {type: 'tool_call', callId: 'call_1', name: 'countTickets', args: {status: 'open', priority: 'high'}};
    }
    const r = toolResult.content; // {count, filters, scope}
    return {type: 'text', text: `There are ${r.count} ${r.filters.status} ${r.filters.priority}-priority support tickets in your organisation.`};
  };
  model.calls = 0;
  model.simulated = true;
  return model;
};
