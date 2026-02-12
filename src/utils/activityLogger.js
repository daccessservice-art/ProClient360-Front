const { 
  logEntityCreation, 
  logEntityUpdate, 
  logEntityDeletion, 
  logAssignment, 
  logStatusChange 
} = require('../middlewares/activityLogger');

/**
 * Helper function to log entity creation
 * @param {Object} entity - The entity that was created
 * @param {Object} user - The user who performed the action
 * @param {Object} req - The request object
 * @param {String} entityType - The type of entity (e.g., 'Customer', 'Employee')
 */
exports.logCreation = async (entity, user, req, entityType) => {
  try {
    await logEntityCreation(entity, entityType, user, req);
  } catch (error) {
    console.error(`Error logging ${entityType} creation:`, error);
  }
};

/**
 * Helper function to log entity update
 * @param {Object} oldEntity - The entity before update
 * @param {Object} newEntity - The entity after update
 * @param {Object} user - The user who performed the action
 * @param {Object} req - The request object
 * @param {String} entityType - The type of entity (e.g., 'Customer', 'Employee')
 */
exports.logUpdate = async (oldEntity, newEntity, user, req, entityType) => {
  try {
    await logEntityUpdate(oldEntity, newEntity, entityType, user, req);
  } catch (error) {
    console.error(`Error logging ${entityType} update:`, error);
  }
};

/**
 * Helper function to log entity deletion
 * @param {Object} entity - The entity that was deleted
 * @param {Object} user - The user who performed the action
 * @param {Object} req - The request object
 * @param {String} entityType - The type of entity (e.g., 'Customer', 'Employee')
 */
exports.logDeletion = async (entity, user, req, entityType) => {
  try {
    await logEntityDeletion(entity, entityType, user, req);
  } catch (error) {
    console.error(`Error logging ${entityType} deletion:`, error);
  }
};

/**
 * Helper function to log entity assignment
 * @param {Object} entity - The entity that was assigned
 * @param {Object} assignedTo - The entity it was assigned to
 * @param {Object} user - The user who performed the action
 * @param {Object} req - The request object
 * @param {String} entityType - The type of entity (e.g., 'Customer', 'Employee')
 */
exports.logAssignment = async (entity, assignedTo, user, req, entityType) => {
  try {
    await logAssignment(entity, assignedTo, entityType, user, req);
  } catch (error) {
    console.error(`Error logging ${entityType} assignment:`, error);
  }
};

/**
 * Helper function to log status change
 * @param {Object} entity - The entity whose status changed
 * @param {String} oldStatus - The old status
 * @param {String} newStatus - The new status
 * @param {Object} user - The user who performed the action
 * @param {Object} req - The request object
 * @param {String} entityType - The type of entity (e.g., 'Customer', 'Employee')
 */
exports.logStatusChange = async (entity, oldStatus, newStatus, user, req, entityType) => {
  try {
    await logStatusChange(entity, oldStatus, newStatus, entityType, user, req);
  } catch (error) {
    console.error(`Error logging ${entityType} status change:`, error);
  }
};