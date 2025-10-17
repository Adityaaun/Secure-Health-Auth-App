/**
 * Finds a device by its ID in the user's device list.
 * If not found, it adds it as a new, untrusted device.
 * @param {object} user - The Mongoose user object.
 * @param {string} deviceId - The fingerprint ID from the client.
 * @param {string} userAgent - The user-agent string from the request headers.
 * @returns {{isTrusted: boolean, isNew: boolean}}
 */
export function findOrRegisterDevice(user, deviceId, userAgent) {
  if (!user.devices) {
    user.devices = [];
  }

  const existingDevice = user.devices.find(d => d.deviceId === deviceId);

  if (existingDevice) {
    existingDevice.lastSeenAt = new Date();
    return {
      isTrusted: existingDevice.trusted,
      isNew: false
    };
  }

  // Device not found, so add it
  user.devices.push({
    deviceId,
    userAgent,
    firstSeenAt: new Date(),
    lastSeenAt: new Date(),
    trusted: false // A new device is never trusted by default
  });

  return {
    isTrusted: false,
    isNew: true
  };
}