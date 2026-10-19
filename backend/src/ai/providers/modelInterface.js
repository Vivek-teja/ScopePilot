/**
 * Abstract Model Interface
 *
 * Review 4: "Keep model calls behind a small interface so the prototype
 * is not tightly coupled to one local model."
 */

class BaseModelProvider {
  constructor(name) {
    this.name = name;
  }

  /**
   * Health check to test if provider/endpoint is available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    return false;
  }

  /**
   * Generate structured scope comparison given retrieved evidence
   * @param {Object} context
   * @param {Object} context.newClientRequest
   * @param {Array} context.retrievedPassages
   * @param {Object} context.approvedProposalVersion
   * @param {Array} context.deliverables
   * @returns {Promise<Object>}
   */
  async generateComparison(_context) {
    throw new Error('generateComparison must be implemented by subclass');
  }
}

module.exports = {
  BaseModelProvider,
};
