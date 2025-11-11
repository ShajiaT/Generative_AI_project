// src/controllers/businessController.js
import supabaseService from '../services/supabaseService.js';

/**
 * @swagger
 * components:
 *   schemas:
 *     Business:
 *       type: object
 *       required:
 *         - name
 *         - type
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: The auto-generated ID of the business
 *         user_id:
 *           type: string
 *           format: uuid
 *           description: ID of the user who owns this business
 *         name:
 *           type: string
 *           description: Business name
 *         type:
 *           type: string
 *           description: Business type/category
 *         address:
 *           type: string
 *           description: Physical address of the business
 *         contact:
 *           type: string
 *           description: Contact information (phone, email, etc.)
 *         images:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of image URLs from Supabase Storage
 *         reviews:
 *           type: array
 *           items:
 *             type: object
 *           description: Array of customer reviews
 *         rating:
 *           type: number
 *           minimum: 0
 *           maximum: 5
 *           description: Average rating (0.0 to 5.0)
 *         description:
 *           type: string
 *           description: Detailed business description
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Business creation timestamp
 */

/**
 * @swagger
 * /api/business:
 *   post:
 *     summary: Create a new business
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Blue Moon Hotel"
 *               type:
 *                 type: string
 *                 example: "Hospitality"
 *               address:
 *                 type: string
 *                 example: "123 Main St, City, State"
 *               contact:
 *                 type: string
 *                 example: "+1-555-123-4567"
 *               description:
 *                 type: string
 *                 example: "A luxury hotel in the heart of the city"
 *     responses:
 *       201:
 *         description: Business successfully created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 business:
 *                   $ref: '#/components/schemas/Business'
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 */
export const createBusiness = async (req, res) => {
  try {
    const { name, type, address, contact, description } = req.body;
    const userId = req.user.id;

    // Validation
    if (!name || !type) {
      return res.status(400).json({
        error: 'Business name and type are required'
      });
    }

    console.log('Creating business for user:', userId);

    const businessData = {
      user_id: userId,
      name: name.trim(),
      type: type.trim(),
      address: address?.trim() || null,
      contact: contact?.trim() || null,
      description: description?.trim() || null,
      images: [],
      reviews: [],
      rating: 0.0
    };

    const { data: business, error } = await supabaseService.createBusiness(businessData);

    if (error) {
      console.error('Business creation error:', error);
      return res.status(400).json({
        error: 'Failed to create business'
      });
    }

    console.log('Business created successfully:', business.name);

    res.status(201).json({
      message: 'Business created successfully',
      business
    });

  } catch (err) {
    console.error('Create business error:', err);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/business:
 *   get:
 *     summary: Get all businesses
 *     tags: [Business]
 *     responses:
 *       200:
 *         description: List of all businesses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 businesses:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Business'
 *                 total:
 *                   type: number
 */
export const getAllBusinesses = async (req, res) => {
  try {
    console.log('Fetching all businesses');

    const { data: businesses, error } = await supabaseService.getAllBusinesses();

    if (error) {
      console.error('Get businesses error:', error);
      return res.status(400).json({
        error: 'Failed to fetch businesses'
      });
    }

    console.log(`Retrieved ${businesses.length} businesses`);
    
    // Log business IDs and image counts for debugging
    businesses.forEach(business => {
      console.log(`Business: ${business.name} (ID: ${business.id}) - Images: ${business.images ? business.images.length : 0}`);
    });

    res.status(200).json({
      businesses: businesses.map(business => ({
        ...business,
        imageCount: business.images ? business.images.length : 0
      })),
      total: businesses.length
    });

  } catch (err) {
    console.error('Get all businesses error:', err);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/business/{id}:
 *   get:
 *     summary: Get business details by ID
 *     tags: [Business]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Business ID
 *     responses:
 *       200:
 *         description: Business details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 business:
 *                   $ref: '#/components/schemas/Business'
 *       404:
 *         description: Business not found
 */
export const getBusinessById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('Getting business details for ID:', id);

    const { data: business, error } = await supabaseService.getBusinessById(id);

    if (error || !business) {
      return res.status(404).json({
        error: 'Business not found'
      });
    }

    console.log('Business details retrieved:', business.name);
    console.log('Business images:', business.images);

    res.status(200).json({
      business: {
        ...business,
        imageCount: business.images ? business.images.length : 0
      }
    });

  } catch (err) {
    console.error('Get business error:', err);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/business/{id}:
 *   put:
 *     summary: Update business information
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Business ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *               address:
 *                 type: string
 *               contact:
 *                 type: string
 *               description:
 *                 type: string
 *               rating:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 5
 *     responses:
 *       200:
 *         description: Business updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
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
export const updateBusiness = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { name, type, address, contact, description, rating } = req.body;

    console.log('Updating business:', id, 'by user:', userId);

    // First, check if business exists and user owns it
    const { data: existingBusiness, error: fetchError } = await supabaseService.getBusinessById(id);

    if (fetchError || !existingBusiness) {
      return res.status(404).json({
        error: 'Business not found'
      });
    }

    if (existingBusiness.user_id !== userId) {
      return res.status(403).json({
        error: 'You can only update your own businesses'
      });
    }

    // Prepare update data (only include provided fields)
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (type !== undefined) updateData.type = type.trim();
    if (address !== undefined) updateData.address = address?.trim() || null;
    if (contact !== undefined) updateData.contact = contact?.trim() || null;
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (rating !== undefined) {
      if (typeof rating !== 'number' || rating < 0 || rating > 5) {
        return res.status(400).json({
          error: 'Rating must be a number between 0 and 5'
        });
      }
      updateData.rating = rating;
    }

    const { data: business, error } = await supabaseService.updateBusiness(id, updateData);

    if (error) {
      console.error('Business update error:', error);
      return res.status(400).json({
        error: 'Failed to update business'
      });
    }

    console.log('Business updated successfully:', business.name);

    res.status(200).json({
      message: 'Business updated successfully',
      business
    });

  } catch (err) {
    console.error('Update business error:', err);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/business/{id}:
 *   delete:
 *     summary: Delete a business
 *     tags: [Business]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Business ID
 *     responses:
 *       200:
 *         description: Business deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not business owner
 *       404:
 *         description: Business not found
 */
export const deleteBusiness = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    console.log('Deleting business:', id, 'by user:', userId);

    // First, check if business exists and user owns it
    const { data: existingBusiness, error: fetchError } = await supabaseService.getBusinessById(id);

    if (fetchError || !existingBusiness) {
      return res.status(404).json({
        error: 'Business not found'
      });
    }

    if (existingBusiness.user_id !== userId) {
      return res.status(403).json({
        error: 'You can only delete your own businesses'
      });
    }

    const { error } = await supabaseService.deleteBusiness(id);

    if (error) {
      console.error('Business deletion error:', error);
      return res.status(400).json({
        error: 'Failed to delete business'
      });
    }

    console.log('Business deleted successfully:', existingBusiness.name);

    res.status(200).json({
      message: 'Business deleted successfully'
    });

  } catch (err) {
    console.error('Delete business error:', err);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

/**
 * @swagger
 * /api/business/validate-images/{businessId}:
 *   get:
 *     summary: Validate business images and URLs
 *     tags: [Business]
 *     parameters:
 *       - in: path
 *         name: businessId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Business ID to validate images for
 *     responses:
 *       200:
 *         description: Image validation results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 businessId:
 *                   type: string
 *                 businessName:
 *                   type: string
 *                 totalImages:
 *                   type: number
 *                 validImages:
 *                   type: number
 *                 images:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       url:
 *                         type: string
 *                       isValid:
 *                         type: boolean
 *                       publicUrl:
 *                         type: string
 *       404:
 *         description: Business not found
 */
export const validateBusinessImages = async (req, res) => {
  try {
    const { businessId } = req.params;
    
    console.log('Validating images for business:', businessId);
    
    // Get business data
    const { data: business, error } = await supabaseService.getBusinessById(businessId);
    
    if (error || !business) {
      return res.status(404).json({
        success: false,
        error: 'Business not found'
      });
    }
    
    const images = business.images || [];
    const validationResults = [];
    
    for (const imageUrl of images) {
      const isValid = imageUrl && imageUrl.includes('business-images');
      const publicUrl = isValid ? supabaseService.getBusinessImageUrl(imageUrl) : null;
      
      validationResults.push({
        url: imageUrl,
        isValid,
        publicUrl,
        isBucketUrl: imageUrl?.includes('business-images'),
        hasProtocol: imageUrl?.startsWith('http')
      });
    }
    
    const validCount = validationResults.filter(img => img.isValid).length;
    
    console.log(`Image validation complete: ${validCount}/${images.length} valid images`);
    
    res.status(200).json({
      success: true,
      businessId: business.id,
      businessName: business.name,
      totalImages: images.length,
      validImages: validCount,
      images: validationResults,
      rawImageArray: images
    });
    
  } catch (err) {
    console.error('Validate business images error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: err.message
    });
  }
};