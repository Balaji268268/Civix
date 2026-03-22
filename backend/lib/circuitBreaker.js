/**
 * Circuit Breaker for ML Service Calls
 * Prevents cascading queue pile-ups during ML service degradation.
 */

class CircuitBreaker {
  constructor(name = 'ML_Service', failureThreshold = 5, cooldownPeriodMs = 30000) {
    this.name = name;
    this.failureThreshold = failureThreshold;
    this.cooldownPeriodMs = cooldownPeriodMs;
    this.failureCount = 0;
    this.state = 'CLOSED'; // 'CLOSED', 'OPEN', 'HALF-OPEN'
    this.lastFailureTime = null;
  }

  isOpen() {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.cooldownPeriodMs) {
        this.state = 'HALF-OPEN';
        return false;
      }
      return true;
    }
    return false;
  }

  recordSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  recordFailure() {
    this.failureCount += 1;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      console.warn(`[CircuitBreaker] ${this.name} circuit OPENED after ${this.failureCount} failures.`);
    }
  }
}

const mlBreaker = new CircuitBreaker('ML_Service', 5, 20000);

module.exports = {
  CircuitBreaker,
  mlBreaker
};
