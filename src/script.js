class StateMachine {
  constructor(options = {}) {
    const {
      init = "idle",
      maxStates = 1000,
      debug = false,
      name = Math.random().toString(16).slice(2, 6)
    } = options;
    this._states = [init];
    this._maxStates = maxStates;
    this._debug = debug;
    this._name = name;
    //
    this._handlers = [];
    this._core = {
      enter: 1,
      leave: 0,
    };
  }

  _debugLog(...args) {
    if (!this._debug) return;
    console.debug(`[${this._name}]`, ...args);
  }

  _readState(countFromEnd = 1) {
    const {
      _states: states,
      _states: { length },
    } = this;
    return states[length - countFromEnd];
  }

  _pushState(value) {
    this._states.push(value);
    if (this._states.length > this._maxStates) {
      this._debugLog(`maxStatesLogLength reached, removing oldest record`);
      this._states.shift();
    }
    return value;
  }

  /**
   * 
   * @param {object} options
   * @param {string} options.change
   * @param {string} options.from
   * @param {string} options.to
   * @param {function} options.callback
   * @param {number} [options.priority] - '0' for enter core change, '1' for leave core change, '-1' for other changes until other number is specified
   * @param {string} [options.comment] - a comment for developer
   * @returns {undefined}
   */
  addStateHandler({
    change,
    from,
    to,
    callback,
    priority,
    comment,
  } = {}) {
    if (!(change in this._core)) {
      // validate 'change-from-to' combinations
      const existingHandlers = this._handlers.filter((handler) => {
        return handler.change === change && handler.from === from;
      });

      const isSameTo = existingHandlers
        .filter((handler) => "to" in handler)
        .every((handler) => handler.to === to);

      if (!isSameTo) {
        this._debugLog(
          `invalid destination state: "${to}" while already used: "${existingHandlers[0].to}"`
        );
        return;
      }
    }
    // compose new handler item
    const stateHandler = {
      change,
      from: change === "enter"
        ? null
        : from,
      to: change === "leave"
        ? null
        : to,
      callback,
      priority: typeof priority === 'number'
        ? priority
        : change in this._core
          ? this._core[change]
          : -1,
      comment,
    };
    this._handlers.push(stateHandler);

    this._debugLog(
      `added on "${change}": "${stateHandler.from}" --> "${stateHandler.to}:"`,
      stateHandler
    );
  }

  /**
   * 
   * @param {object} criterias - remove each state handler thet meets all criterias provided 
   * @param {string} [criterias.change]
   * @param {string} [criterias.from]
   * @param {string} [criterias.to]
   * @param {function} [criterias.callback]
   * @param {number} [criterias.priority]
   * @param {string} [criterias.comment]
   * @returns {undefined}
   */
  removeStateHandler(criterias) {
    const isCriteriaProvided =
      criterias &&
      Object.values(criterias).some((criteria) => criteria !== undefined);

    if (!isCriteriaProvided) {
      this._debugLog(`no criteria provided to remove any state handler`);
      return;
    }

    const parts = this._handlers.reduce((acc, handler) => {
      const isHandlerRemoved = Object.entries(criterias).every(
        ([key, value]) => handler[key] === value
      );
      const key = isHandlerRemoved ? 'remove' : 'keep';
      acc[key].push(handler);

      return acc;
    }, { keep: [], remove: [] });

    this._handlers = parts.keep;

    this._debugLog(
      `according to critrerias provided:`,
      criterias,
      `, removed ${parts.remove.length} handlers:`,
      parts.remove
    );
  }

  /**
   * init state change
   * @param {string} change - a registered change name
   * @returns {string} - current or new state 
   */
  initState(change) {
    const from = this._readState();
    this._debugLog(`init "${change}" : "${from}" ==>> "?????"`);

    // corner case
    if (change in this._core) {
      this._debugLog(
        `fail "${change}" : core change can not be inited externally`
      );

      return from;
    }
    const anyChangeHandlerFound = this._handlers.find(handler =>
      handler.from === from && handler.change === change
    );

    // check if event is defined
    if (!anyChangeHandlerFound) {
      // state is not changed
      this._debugLog(
        `fail "${change}" : "${from}" ignores event "${change}"`
      );
      return from;
    }

    const to = anyChangeHandlerFound.to;

    this._goToNextState(change, from, to);

    this._pushState(to);

    // state changed
    this._debugLog(
      `done "${change}" : "${from}" ==>> "${to}"`
    );
    return to;
  }

  _goToNextState(change, from, to) {
    const handlers = this._handlers.filter(handler =>
      (handler.from === from && handler.change === change) ||
      (handler.change === 'leave' && handler.from === from) ||
      (handler.change === 'enter' && handler.to === to)
    )
      // sort in order of ascending of priority
      .sort((a, b) => a.priority - b.priority);

    this._debugLog(
      `pend "${change}" : "${from}" ==>> "${to}":`,
      handlers
    );

    handlers.forEach((handler, index, array) => {
      this._debugLog(
        `exec ${(" ".repeat(3) + (index + 1)).slice(-2)} of ${(
          " ".repeat(3) + array.length
        ).slice(-2)}`,
        `priority ${(" ".repeat(3) + handler.priority.toFixed(2)).slice(
          -5
        )}`,
        (handler.comment ? `comment "${handler.comment}"` : '')
      );
      try {
        handler.callback();
      } catch (error) {
        this._debugLog(`failed to run:`, handler, ', error is:', error);
      }
    });

    return to;
  }
}

const machine = new StateMachine({
  init: "off",
  name: "FIRST",
  debug: 1,
});

machine.addStateHandler({
  change: "enter",
  to: "off",
  callback: () => {
    console.log("off: onEnter");
  },
});

machine.addStateHandler({
  change: "leave",
  from: "off",
  callback: () => {
    console.log("off: onExit");
  },
});

machine.addStateHandler({
  change: "switch",
  from: "off",
  to: "on",
  callback: () => {
    console.log('transition action for "switch" in "off" state');
  },
  comment: "off-switch-on",
});

machine.addStateHandler({
  change: "enter",
  to: "on",
  callback: () => {
    console.log("on: onEnter 1");
  },
});

machine.addStateHandler({
  change: "enter",
  to: "on",
  callback: () => {
    console.log("on: onEnter 2");
  },
  priority: -5,
});

machine.addStateHandler({
  change: "leave",
  from: "on",
  callback: () => {
    console.log("on: onExit");
  },
});

machine.addStateHandler({
  change: "switch",
  from: "on",
  to: "off",
  callback: () => {
    console.log('transition action for "switch" in "on" state');
  },
  comment: "on-switch-off",
});

const removableCallback = () => {
  console.log('transition action for "switch" in "on" state 2');
};

machine.addStateHandler({
  change: "switch",
  from: "on",
  to: "off",
  callback: removableCallback,
  comment: "on-switch-off",
});

machine.removeStateHandler({
  change: "switch",
  from: "on",
  callback: removableCallback,
});

let result = machine._readState();
console.log("🚀 ~ machine:", machine);
console.log(`current state: ${JSON.stringify(result)}`);
result = machine.initState("switch");
console.log(`current state: ${JSON.stringify(result)}`);
result = machine.initState("switch");
console.log(`current state: ${JSON.stringify(result)}`);
result = machine.initState("on");
result = machine.initState("off");
result = machine.initState("enter");
result = machine.initState("leave");
result = machine.initState("switch");
console.log(`current state: ${JSON.stringify(result)}`);
result = machine.initState("switch");
console.log(`current state: ${JSON.stringify(result)}`);
result = machine.initState("switch");
console.log("🚀 ~ machine:", machine);
//