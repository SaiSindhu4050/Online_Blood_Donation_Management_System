/**
 * Blood Group Compatibility Utility
 * Determines which blood groups can donate to a given blood group
 * 
 * Based on official blood compatibility rules:
 * 
 * CAN RECEIVE BLOOD FROM (for finding compatible donors):
 * - A+ can receive from: A+, A-, O+, O-
 * - O+ can receive from: O+, O-
 * - B+ can receive from: B+, B-, O+, O-
 * - AB+ can receive from: Everyone (Universal Recipient)
 * - A- can receive from: A-, O-
 * - O- can receive from: O- Only
 * - B- can receive from: B-, O-
 * - AB- can receive from: AB-, A-, B-, O-
 */

/**
 * Get compatible donor blood groups for a given recipient blood group
 * @param {string} recipientBloodGroup - The blood group that needs blood (e.g., 'A+')
 * @returns {string[]} Array of compatible donor blood groups
 */
function getCompatibleDonorGroups(recipientBloodGroup) {
  const compatibilityMap = {
    // O- can only receive from O-
    'O-': ['O-'],
    
    // O+ can receive from O+, O-
    'O+': ['O+', 'O-'],
    
    // A- can receive from A-, O-
    'A-': ['A-', 'O-'],
    
    // A+ can receive from A+, A-, O+, O-
    'A+': ['A+', 'A-', 'O+', 'O-'],
    
    // B- can receive from B-, O-
    'B-': ['B-', 'O-'],
    
    // B+ can receive from B+, B-, O+, O-
    'B+': ['B+', 'B-', 'O+', 'O-'],
    
    // AB- can receive from AB-, A-, B-, O-
    'AB-': ['AB-', 'A-', 'B-', 'O-'],
    
    // AB+ can receive from everyone (Universal Recipient)
    'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-']
  };

  return compatibilityMap[recipientBloodGroup] || [];
}

/**
 * Check if a donor blood group is compatible with a recipient blood group
 * @param {string} donorBloodGroup - The donor's blood group
 * @param {string} recipientBloodGroup - The recipient's blood group
 * @returns {boolean} True if compatible, false otherwise
 */
function isCompatible(donorBloodGroup, recipientBloodGroup) {
  const compatibleGroups = getCompatibleDonorGroups(recipientBloodGroup);
  return compatibleGroups.includes(donorBloodGroup);
}

module.exports = {
  getCompatibleDonorGroups,
  isCompatible
};
