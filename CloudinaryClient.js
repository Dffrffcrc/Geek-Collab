/**
 * CloudinaryClient - Upload images to Cloudinary with organized folder structure
 */

const CLOUDINARY_CLOUD_NAME = 'dyy4eujyq';

/**
 * Upload base64 image to Cloudinary with organized folder structure
 * 
 * @param {string} base64Image - Base64 encoded image
 * @param {string} resourceId - Forum ID or User ID
 * @param {string} resourceType - 'forum' | 'profile' (default: 'forum')
 * @returns {Promise<string>} - Cloudinary secure URL
 */
export const uploadToCloudinary = async (base64Image, resourceId, resourceType = 'forum') => {
  if (!base64Image) {
    throw new Error('No image provided');
  }

  if (!resourceId) {
    throw new Error('Resource ID is required');
  }

  try {
    const formData = new FormData();
    formData.append('file', `data:image/jpeg;base64,${base64Image}`);
    
    // Use the appropriate preset based on resource type
    if (resourceType === 'profile') {
      formData.append('upload_preset', 'geek_collab_profile_pics');
      formData.append('folder', `profilePics/${resourceId}`);
    } else {
      formData.append('upload_preset', 'geek_collab_forum_media');
      formData.append('folder', `forums/${resourceId}`);
    }

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

/**
 * Generate optimized Cloudinary URL with transformations
 * Useful for responsive images
 * 
 * @param {string} cloudinaryUrl - Original Cloudinary URL
 * @param {Object} options - Transformation options
 * @param {number} options.width - Image width
 * @param {number} options.height - Image height
 * @param {string} options.quality - Image quality ('auto', 'best', 80-100)
 * @returns {string} - Transformed URL
 */
export const getOptimizedImageUrl = (cloudinaryUrl, options = {}) => {
  if (!cloudinaryUrl) return null;

  const { width = 800, height, quality = 'auto' } = options;
  
  // Extract the public_id from the URL
  // URL format: https://res.cloudinary.com/cloud_name/image/upload/v123/forums/forum_id/public_id.jpg
  const urlParts = cloudinaryUrl.split('/upload/');
  if (urlParts.length !== 2) return cloudinaryUrl;

  const basePath = urlParts[0];
  const resourcePath = urlParts[1];

  // Build transformation string
  let transformations = `w_${width}`;
  if (height) {
    transformations += `,h_${height},c_fill`;
  }
  if (quality) {
    transformations += `,q_${quality}`;
  }
  transformations += ',f_auto'; // Auto format selection

  return `${basePath}/upload/${transformations}/${resourcePath}`;
};
