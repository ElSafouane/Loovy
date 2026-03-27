import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

/**
 * Uploads a local image URI to Firebase Storage and returns the download URL.
 * Path: avatars/{uid}/profile.jpg
 * Overwrites any existing avatar.
 */
export const uploadAvatar = async (uid, localUri) => {
  // Fetch the file as a blob
  const response = await fetch(localUri);
  const blob = await response.blob();

  const storageRef = ref(storage, `avatars/${uid}/profile.jpg`);

  await new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, blob, {
      contentType: 'image/jpeg',
    });
    task.on('state_changed', null, reject, resolve);
  });

  return await getDownloadURL(storageRef);
};
