/**
 * event-utils.js
 * Utility functions for event handling
 */

/**
 * Creates a debounced version of a function
 * 
 * @param {Function} func - The function to debounce
 * @param {number} wait - The debounce wait time in milliseconds
 * @param {Object} options - Additional options
 * @param {boolean} [options.leading=false] - Execute on the leading edge
 * @param {boolean} [options.trailing=true] - Execute on the trailing edge
 * @param {boolean} [options.maxWait] - Maximum time func is allowed to be delayed
 * @returns {Function} - Debounced function
 */
function debounce(func, wait, options = {}) {
    let lastArgs;
    let lastThis;
    let maxWait;
    let result;
    let timerId;
    let lastCallTime;
    let lastInvokeTime = 0;
    const leading = !!options.leading;
    const trailing = 'trailing' in options ? !!options.trailing : true;
    const maxing = 'maxWait' in options;
    
    if (maxing) {
      maxWait = Math.max(+options.maxWait || 0, wait);
    }
  
    function invokeFunc(time) {
      const args = lastArgs;
      const thisArg = lastThis;
  
      lastArgs = lastThis = undefined;
      lastInvokeTime = time;
      result = func.apply(thisArg, args);
      return result;
    }
  
    function leadingEdge(time) {
      // Reset any `maxWait` timer.
      lastInvokeTime = time;
      // Start the timer for the trailing edge.
      timerId = setTimeout(timerExpired, wait);
      // Invoke the leading edge.
      return leading ? invokeFunc(time) : result;
    }
  
    function remainingWait(time) {
      const timeSinceLastCall = time - lastCallTime;
      const timeSinceLastInvoke = time - lastInvokeTime;
      const timeWaiting = wait - timeSinceLastCall;
  
      return maxing
        ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
        : timeWaiting;
    }
  
    function shouldInvoke(time) {
      const timeSinceLastCall = time - lastCallTime;
      const timeSinceLastInvoke = time - lastInvokeTime;
  
      // Either this is the first call, activity has stopped and we're at the
      // trailing edge, the system time has gone backwards and we're treating
      // it as the trailing edge, or we've hit the `maxWait` limit.
      return (lastCallTime === undefined || (timeSinceLastCall >= wait) ||
        (timeSinceLastCall < 0) || (maxing && timeSinceLastInvoke >= maxWait));
    }
  
    function timerExpired() {
      const time = Date.now();
      if (shouldInvoke(time)) {
        return trailingEdge(time);
      }
      // Restart the timer.
      timerId = setTimeout(timerExpired, remainingWait(time));
    }
  
    function trailingEdge(time) {
      timerId = undefined;
  
      // Only invoke if we have `lastArgs` which means `func` has been
      // debounced at least once.
      if (trailing && lastArgs) {
        return invokeFunc(time);
      }
      lastArgs = lastThis = undefined;
      return result;
    }
  
    function cancel() {
      if (timerId !== undefined) {
        clearTimeout(timerId);
      }
      lastInvokeTime = 0;
      lastArgs = lastCallTime = lastThis = timerId = undefined;
    }
  
    function flush() {
      return timerId === undefined ? result : trailingEdge(Date.now());
    }
  
    function pending() {
      return timerId !== undefined;
    }
  
    function debounced(...args) {
      const time = Date.now();
      const isInvoking = shouldInvoke(time);
  
      lastArgs = args;
      lastThis = this;
      lastCallTime = time;
  
      if (isInvoking) {
        if (timerId === undefined) {
          return leadingEdge(lastCallTime);
        }
        if (maxing) {
          // Handle invocations in a tight loop.
          timerId = setTimeout(timerExpired, wait);
          return invokeFunc(lastCallTime);
        }
      }
      if (timerId === undefined) {
        timerId = setTimeout(timerExpired, wait);
      }
      return result;
    }
    
    debounced.cancel = cancel;
    debounced.flush = flush;
    debounced.pending = pending;
    
    return debounced;
  }
  
  /**
   * Creates a throttled version of a function
   * 
   * @param {Function} func - The function to throttle
   * @param {number} wait - The throttle wait time in milliseconds
   * @param {Object} options - Additional options
   * @param {boolean} [options.leading=true] - Execute on the leading edge
   * @param {boolean} [options.trailing=true] - Execute on the trailing edge
   * @returns {Function} - Throttled function
   */
  function throttle(func, wait, options = {}) {
    let leading = true;
    let trailing = true;
    
    if (typeof options === 'object') {
      leading = 'leading' in options ? !!options.leading : leading;
      trailing = 'trailing' in options ? !!options.trailing : trailing;
    }
    
    return debounce(func, wait, {
      leading,
      trailing,
      maxWait: wait
    });
  }
  
  module.exports = {
    debounce,
    throttle
  };