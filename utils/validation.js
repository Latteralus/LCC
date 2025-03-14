/**
 * validation.js
 * Utility functions for validating data
 */

/**
 * Validation result object
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether the validation passed
 * @property {string[]} errors - Array of error messages
 */

/**
 * Validator type definitions
 * @typedef {Object} Validator
 * @property {Function} validate - Function to perform validation
 * @property {string} errorMessage - Error message to display if validation fails
 */

/**
 * Creates a successful validation result
 * @returns {ValidationResult} - Successful validation result
 */
function valid() {
    return { valid: true, errors: [] };
  }
  
  /**
   * Creates a failed validation result
   * @param {string|string[]} errors - Error message(s)
   * @returns {ValidationResult} - Failed validation result
   */
  function invalid(errors) {
    const errorArray = Array.isArray(errors) ? errors : [errors];
    return { valid: false, errors: errorArray };
  }
  
  /**
   * Validates that a value is defined (not undefined or null)
   * @param {any} value - Value to validate
   * @param {string} [message] - Custom error message
   * @returns {Validator} - Validator object
   */
  function required(message) {
    return {
      validate: (value) => value !== undefined && value !== null,
      errorMessage: message || 'Value is required'
    };
  }
  
  /**
   * Validates that a value is a string
   * @param {string} [message] - Custom error message
   * @returns {Validator} - Validator object
   */
  function isString(message) {
    return {
      validate: (value) => typeof value === 'string',
      errorMessage: message || 'Value must be a string'
    };
  }
  
  /**
   * Validates that a value is a number
   * @param {string} [message] - Custom error message
   * @returns {Validator} - Validator object
   */
  function isNumber(message) {
    return {
      validate: (value) => typeof value === 'number' && !isNaN(value),
      errorMessage: message || 'Value must be a number'
    };
  }
  
  /**
   * Validates that a value is a boolean
   * @param {string} [message] - Custom error message
   * @returns {Validator} - Validator object
   */
  function isBoolean(message) {
    return {
      validate: (value) => typeof value === 'boolean',
      errorMessage: message || 'Value must be a boolean'
    };
  }
  
  /**
   * Validates that a value is an object
   * @param {string} [message] - Custom error message
   * @returns {Validator} - Validator object
   */
  function isObject(message) {
    return {
      validate: (value) => typeof value === 'object' && value !== null && !Array.isArray(value),
      errorMessage: message || 'Value must be an object'
    };
  }
  
  /**
   * Validates that a value is an array
   * @param {string} [message] - Custom error message
   * @returns {Validator} - Validator object
   */
  function isArray(message) {
    return {
      validate: (value) => Array.isArray(value),
      errorMessage: message || 'Value must be an array'
    };
  }
  
  /**
   * Validates that a value matches a regular expression
   * @param {RegExp} pattern - Regular expression pattern
   * @param {string} [message] - Custom error message
   * @returns {Validator} - Validator object
   */
  function matches(pattern, message) {
    return {
      validate: (value) => pattern.test(String(value)),
      errorMessage: message || `Value must match pattern: ${pattern}`
    };
  }
  
  /**
   * Validates that a value is one of the allowed values
   * @param {Array} allowedValues - Array of allowed values
   * @param {string} [message] - Custom error message
   * @returns {Validator} - Validator object
   */
  function oneOf(allowedValues, message) {
    return {
      validate: (value) => allowedValues.includes(value),
      errorMessage: message || `Value must be one of: ${allowedValues.join(', ')}`
    };
  }
  
  /**
   * Validates that a number is within a specified range
   * @param {number} min - Minimum value (inclusive)
   * @param {number} max - Maximum value (inclusive)
   * @param {string} [message] - Custom error message
   * @returns {Validator} - Validator object
   */
  function range(min, max, message) {
    return {
      validate: (value) => typeof value === 'number' && value >= min && value <= max,
      errorMessage: message || `Value must be between ${min} and ${max}`
    };
  }
  
  /**
   * Validates that a string has a minimum length
   * @param {number} length - Minimum length
   * @param {string} [message] - Custom error message
   * @returns {Validator} - Validator object
   */
  function minLength(length, message) {
    return {
      validate: (value) => typeof value === 'string' && value.length >= length,
      errorMessage: message || `Value must be at least ${length} characters long`
    };
  }
  
  /**
   * Validates that a string has a maximum length
   * @param {number} length - Maximum length
   * @param {string} [message] - Custom error message
   * @returns {Validator} - Validator object
   */
  function maxLength(length, message) {
    return {
      validate: (value) => typeof value === 'string' && value.length <= length,
      errorMessage: message || `Value must be at most ${length} characters long`
    };
  }
  
  /**
   * Validates an object against a schema
   * @param {Object} value - Object to validate
   * @param {Object} schema - Validation schema
   * @returns {ValidationResult} - Validation result
   */
  function validateObject(value, schema) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return invalid('Value must be an object');
    }
  
    const errors = [];
  
    // Validate each field in the schema
    for (const [field, validators] of Object.entries(schema)) {
      const fieldValidators = Array.isArray(validators) ? validators : [validators];
      const fieldValue = value[field];
  
      // Check if the field is required
      const isRequired = fieldValidators.some(v => v === required || (v.validate && v.validate === required.validate));
      
      // Skip validation for undefined optional fields
      if (fieldValue === undefined && !isRequired) {
        continue;
      }
  
      // Apply each validator
      for (const validator of fieldValidators) {
        if (typeof validator === 'function') {
          // If the validator is a function, call it directly
          const result = validator(fieldValue);
          if (!result.valid) {
            errors.push(...result.errors.map(err => `${field}: ${err}`));
          }
        } else if (validator && typeof validator.validate === 'function') {
          // If the validator is an object with a validate method
          if (!validator.validate(fieldValue)) {
            errors.push(`${field}: ${validator.errorMessage}`);
          }
        }
      }
    }
  
    return errors.length > 0 ? invalid(errors) : valid();
  }
  
  /**
   * Creates a schema validator function for an object
   * @param {Object} schema - Validation schema
   * @returns {Function} - Validator function
   */
  function createObjectValidator(schema) {
    return (value) => validateObject(value, schema);
  }
  
  /**
   * Validates an array of items against a validator
   * @param {Array} array - Array to validate
   * @param {Function|Validator} itemValidator - Validator for each item
   * @returns {ValidationResult} - Validation result
   */
  function validateArray(array, itemValidator) {
    if (!Array.isArray(array)) {
      return invalid('Value must be an array');
    }
  
    const errors = [];
  
    array.forEach((item, index) => {
      if (typeof itemValidator === 'function') {
        // If the item validator is a function, call it directly
        const result = itemValidator(item);
        if (!result.valid) {
          errors.push(...result.errors.map(err => `[${index}]: ${err}`));
        }
      } else if (itemValidator && typeof itemValidator.validate === 'function') {
        // If the item validator is an object with a validate method
        if (!itemValidator.validate(item)) {
          errors.push(`[${index}]: ${itemValidator.errorMessage}`);
        }
      }
    });
  
    return errors.length > 0 ? invalid(errors) : valid();
  }
  
  /**
   * Combines multiple validators into a single validator
   * @param {...Function} validators - Validators to combine
   * @returns {Function} - Combined validator
   */
  function compose(...validators) {
    return (value) => {
      const errors = [];
  
      for (const validator of validators) {
        const result = validator(value);
        if (!result.valid) {
          errors.push(...result.errors);
        }
      }
  
      return errors.length > 0 ? invalid(errors) : valid();
    };
  }
  
  module.exports = {
    valid,
    invalid,
    required,
    isString,
    isNumber,
    isBoolean,
    isObject,
    isArray,
    matches,
    oneOf,
    range,
    minLength,
    maxLength,
    validateObject,
    validateArray,
    createObjectValidator,
    compose
  };