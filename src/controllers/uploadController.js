// src/controllers/uploadController.js
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import supabaseService from '../services/supabaseService.js';

// Configure multer for memory storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Allow only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

/**
 * @swagger
 * /api/upload-image:
 *   post:
 *     summary: Upload business image to Supabase Storage
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file to upload (max 5MB)
 *               business_id:
 *                 type: string
 *                 format: uuid
 *                 description: Optional business ID to associate with the image
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 imageUrl:
 *                   type: string
 *                   description: Public URL of the uploaded image
 *                 fileName:
 *                   type: string
 *                   description: Generated filename in storage
 *       400:
 *         description: Bad request - no file or invalid file
 *       401:
 *         description: Unauthorized
 *       413:
 *         description: File too large
 */
export const uploadBusinessImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No image file provided'
      });
    }

    const { business_id } = req.body;
    const userId = req.user.id;

    console.log('Uploading image for user:', userId);

    // Generate unique filename
    const fileExtension = req.file.originalname.split('.').pop();
    const fileName = `${userId}/${uuidv4()}.${fileExtension}`;

    // Upload to Supabase Storage
    const { data, error } = await supabaseService.uploadBusinessImage(req.file.buffer, fileName);

    if (error) {
      console.error('Image upload error:', error);
      
      // Handle specific storage errors
      if (error.__isStorageError) {
        if (error.status === 403 || error.statusCode === '403') {
          return res.status(403).json({
            error: 'Storage access denied. Please check storage policies.'
          });
        }
        if (error.status === 413 || error.statusCode === '413') {
          return res.status(413).json({
            error: 'File too large for storage'
          });
        }
      }
      
      return res.status(400).json({
        error: 'Failed to upload image: ' + (error.message || 'Unknown error')
      });
    }

    console.log('Image uploaded successfully:', data.publicUrl);

    let businessUpdated = false;
    let updatedBusiness = null;

    // If business_id is provided, add the image URL to the business
    if (business_id) {
      try {
        console.log('Attempting to add image URL to business:', business_id);
        
        // Get current business
        const { data: business, error: businessError } = await supabaseService.getBusinessById(business_id);
        
        if (businessError) {
          console.error('Error fetching business:', businessError);
        } else if (!business) {
          console.error('Business not found:', business_id);
        } else if (business.user_id !== userId) {
          console.error('User does not own this business. Business owner:', business.user_id, 'Current user:', userId);
        } else {
          // Use the specialized method to add image to business array
          const { data: businessUpdateResult, error: businessUpdateError } = await supabaseService.addImageToBusiness(business_id, data.publicUrl);
          
          if (businessUpdateError) {
            console.error('Failed to update business with image URL:', businessUpdateError);
          } else {
            console.log('✅ Image URL successfully added to business database');
            businessUpdated = true;
            updatedBusiness = businessUpdateResult;
          }
        }
      } catch (businessUpdateError) {
        console.error('Exception while updating business with image URL:', businessUpdateError);
      }
    }

    const response = {
      message: 'Image uploaded successfully',
      imageUrl: data.publicUrl,
      fileName: data.path,
      businessUpdated: businessUpdated
    };

    if (businessUpdated && updatedBusiness) {
      response.business = updatedBusiness;
    }

    res.status(200).json(response);

  } catch (err) {
    console.error('Upload image error:', err);
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'File size too large. Maximum size is 5MB.'
      });
    }
    
    if (err.message === 'Only image files are allowed!') {
      return res.status(400).json({
        error: 'Only image files are allowed'
      });
    }

    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/upload-image/business/{businessId}:
 *   post:
 *     summary: Upload and associate image with specific business
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Business ID to associate the image with
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file to upload (max 5MB)
 *     responses:
 *       200:
 *         description: Image uploaded and associated with business successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 imageUrl:
 *                   type: string
 *                 business:
 *                   $ref: '#/components/schemas/Business'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not business owner
 *       404:
 *         description: Business not found
 */
export const uploadImageToBusiness = async (req, res) => {
  try {
    console.log('=== Upload Image to Business Request ===');
    console.log('Business ID:', req.params.businessId);
    console.log('File:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'No file');
    console.log('User:', req.user ? req.user.id : 'Not authenticated');

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided. Please select an image file to upload.'
      });
    }

    const { businessId } = req.params;
    const userId = req.user.id;

    // Validate business ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!businessId || !uuidRegex.test(businessId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid Business ID (UUID format) is required'
      });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
      });
    }

    console.log('Verifying business exists and checking permissions...');

    // Check if business exists and user owns it
    const { data: business, error: businessError } = await supabaseService.getBusinessById(businessId);

    if (businessError) {
      console.error('Business lookup error:', businessError);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify business',
        details: businessError.message
      });
    }

    if (!business) {
      console.error('Business not found for ID:', businessId);
      return res.status(404).json({
        success: false,
        error: `Business not found with ID: ${businessId}`
      });
    }

    console.log('✅ Business found:', business.name);
    console.log('Current images count:', business.images ? business.images.length : 0);

    if (business.user_id !== userId) {
      console.error('Permission denied - user does not own business');
      return res.status(403).json({
        success: false,
        error: 'Permission denied: You can only upload images to your own businesses'
      });
    }

    // Generate unique filename with better organization
    const fileExtension = req.file.originalname.split('.').pop();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${userId}/${businessId}/${timestamp}-${uuidv4()}.${fileExtension}`;

    console.log('📤 Uploading to Supabase Storage with filename:', fileName);

    // Upload to Supabase Storage
    const { data, error } = await supabaseService.uploadBusinessImage(req.file.buffer, fileName);

    if (error) {
      console.error('❌ Storage upload error:', error);
      
      // Handle specific storage errors
      if (error.__isStorageError) {
        if (error.status === 403 || error.statusCode === '403') {
          return res.status(403).json({
            success: false,
            error: 'Storage access denied. Please check storage policies.',
            details: error.message
          });
        }
        if (error.status === 413 || error.statusCode === '413') {
          return res.status(413).json({
            success: false,
            error: 'File too large for storage (max 5MB)',
            details: error.message
          });
        }
      }
      
      return res.status(400).json({
        success: false,
        error: 'Failed to upload image to storage',
        details: error.message || 'Unknown error'
      });
    }

    if (!data || !data.path) {
      console.error('❌ No upload data returned from storage');
      return res.status(500).json({
        success: false,
        error: 'Upload succeeded but no file path returned'
      });
    }

    console.log('✅ Image uploaded to storage successfully');
    console.log('📁 Storage path:', data.path);
    console.log('🔗 Public URL:', data.publicUrl);

    // Add image URL to business using specialized method with better error handling
    console.log('💾 Updating business database with image URL...');
    console.log('Current business images:', business.images);
    console.log('Adding URL to database:', data.path); // Use storage path, not public URL
    
    const { data: updatedBusiness, error: updateError } = await supabaseService.addImageToBusiness(businessId, data.path);

    if (updateError) {
      console.error('❌ Database update error:', updateError);
      
      // Attempt to clean up uploaded file if database update fails
      try {
        await supabaseService.deleteBusinessImage(data.path);
        console.log('🧹 Cleaned up uploaded file after database error');
      } catch (cleanupError) {
        console.error('⚠️ Failed to cleanup uploaded file:', cleanupError);
      }
      
      return res.status(500).json({
        success: false,
        error: 'Image uploaded but failed to associate with business',
        details: updateError.message,
        storagePath: data.path
      });
    }

    console.log('✅ Business successfully updated with new image URL');
    console.log('📊 Updated business images:', updatedBusiness?.images);

    // Get the full public URL for the response
    const { data: publicUrlData } = supabaseService.supabase.storage
      .from('business-images')
      .getPublicUrl(data.path);
    
    const publicUrl = publicUrlData?.publicUrl || data.publicUrl;

    console.log('🎉 Image uploaded and associated with business successfully');

    res.status(200).json({
      success: true,
      message: 'Image uploaded and associated with business successfully',
      data: {
        imageUrl: data.path,        // Storage path (what's saved in DB)
        publicUrl: publicUrl,       // Full public URL for display
        fileName: fileName,
        business: updatedBusiness,
        uploadedFile: {
          originalName: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype
        }
      }
    });

  } catch (err) {
    console.error('❌ Upload image to business error:', err);
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'File size too large. Maximum size is 5MB.'
      });
    }
    
    if (err.message === 'Only image files are allowed!') {
      return res.status(400).json({
        success: false,
        error: 'Only image files are allowed'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error during image upload',
      details: err.message
    });
  }
};