// src/services/supabaseService.js
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

class SupabaseService {
  constructor() {
    // Validate environment variables
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log('Environment check:')
    console.log('SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
    console.log('SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing')
    console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing')

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error('Missing required Supabase environment variables. Please check your .env file.')
    }

    // Initialize clients
    this.client = createClient(supabaseUrl, supabaseAnonKey)

    this.adminClient = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Storage bucket name
    this.BUSINESS_IMAGES_BUCKET = 'business-images'
    
    // Flag to track if bucket has been checked
    this._bucketChecked = false;
  }

  // Test database connection
  async testConnection() {
    try {
      const { data, error } = await this.client.from('users').select('count').limit(1)
      if (error) throw error
      console.log('✅ Supabase connection successful')
      return true
    } catch (error) {
      console.error('❌ Supabase connection failed:', error.message)
      return false
    }
  }

  // ===== USER OPERATIONS =====
  async createUser(userData) {
    try {
      const { data, error } = await this.adminClient
        .from('users')
        .insert([userData])
        .select()
        .single()
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  async getUserByEmail(email) {
    try {
      const { data, error } = await this.client
        .from('users')
        .select('*')
        .eq('email', email)
        .single()
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  async getUserById(id) {
    try {
      const { data, error } = await this.client
        .from('users')
        .select('id, email, business_id, created_at')
        .eq('id', id)
        .single()
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  // ===== BUSINESS OPERATIONS =====
  async createBusiness(businessData) {
    try {
      // Ensure images is always an array
      const processedData = {
        ...businessData,
        images: businessData.images || []
      };
      
      console.log('Creating business with data:', JSON.stringify(processedData, null, 2));
      
      const { data, error } = await this.client
        .from('business')
        .insert([processedData])
        .select()
        .single()
      
      if (error) {
        console.error('Create business error:', error);
        throw error;
      }
      
      console.log('Business created successfully:', data);
      return { data, error: null }
    } catch (error) {
      console.error('Create business service error:', error);
      return { data: null, error }
    }
  }

  async getAllBusinesses() {
    try {
      const { data, error } = await this.client
        .from('business')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  async getBusinessById(id) {
    try {
      const { data, error } = await this.client
        .from('business')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  async updateBusiness(id, businessData) {
    try {
      console.log('Updating business in database:', id);
      console.log('Update data:', JSON.stringify(businessData, null, 2));
      
      // If updating images, ensure it's properly formatted as an array
      const processedData = { ...businessData };
      if (processedData.images) {
        // Ensure images is an array
        if (!Array.isArray(processedData.images)) {
          console.warn('Images field is not an array, converting:', processedData.images);
          processedData.images = [];
        }
        console.log('Processed images array:', processedData.images);
      }
      
      const { data, error } = await this.client
        .from('business')
        .update(processedData)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        console.error('Database update error:', error);
        throw error;
      }
      
      console.log('Business updated successfully:', data);
      console.log('Updated business images:', data.images);
      return { data, error: null }
    } catch (error) {
      console.error('Update business service error:', error);
      return { data: null, error }
    }
  }

  async deleteBusiness(id) {
    try {
      const { data, error } = await this.client
        .from('business')
        .delete()
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  // ===== STORAGE OPERATIONS =====
  async uploadBusinessImage(file, fileName) {
    try {
      console.log('Uploading file to storage with admin client:', fileName);
      
      // Ensure bucket exists before uploading
      if (!this._bucketChecked) {
        await this.createStorageBucket();
        this._bucketChecked = true;
      }
      
      // Use admin client to bypass RLS policies
      const { data, error } = await this.adminClient.storage
        .from(this.BUSINESS_IMAGES_BUCKET)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (error) {
        console.error('Storage upload error:', error);
        throw error;
      }
      
      console.log('File uploaded successfully:', data.path);
      
      // Get public URL using admin client
      const { data: publicURL } = this.adminClient.storage
        .from(this.BUSINESS_IMAGES_BUCKET)
        .getPublicUrl(fileName)
      
      console.log('Public URL generated:', publicURL.publicUrl);
      
      return { 
        data: { 
          path: data.path, 
          publicUrl: publicURL.publicUrl 
        }, 
        error: null 
      }
    } catch (error) {
      console.error('Upload business image error:', error);
      return { data: null, error }
    }
  }

  async deleteBusinessImage(fileName) {
    try {
      console.log('Deleting file from storage:', fileName);
      
      // Use admin client to bypass RLS policies
      const { data, error } = await this.adminClient.storage
        .from(this.BUSINESS_IMAGES_BUCKET)
        .remove([fileName])
      
      if (error) throw error
      
      console.log('File deleted successfully:', fileName);
      return { data, error: null }
    } catch (error) {
      console.error('Delete business image error:', error);
      return { data: null, error }
    }
  }

  // Create storage bucket if it doesn't exist
  async createStorageBucket() {
    try {
      console.log('Checking/creating storage bucket:', this.BUSINESS_IMAGES_BUCKET);
      
      const { data, error } = await this.adminClient.storage.createBucket(this.BUSINESS_IMAGES_BUCKET, {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpg', 'image/jpeg', 'image/webp', 'image/gif'],
        fileSizeLimit: 5242880 // 5MB
      });
      
      if (error) {
        // Check if bucket already exists (different possible error formats)
        const bucketExistsMessages = [
          'Bucket already exists',
          'The resource already exists',
          'already exists'
        ];
        
        const isAlreadyExists = error.__isStorageError && 
          (error.statusCode === '409' || error.status === 409) ||
          bucketExistsMessages.some(msg => error.message?.includes(msg));
        
        if (isAlreadyExists) {
          console.log('✅ Storage bucket already exists:', this.BUSINESS_IMAGES_BUCKET);
          return true;
        } else {
          console.error('Bucket creation error:', error);
          return false;
        }
      }
      
      console.log('✅ Storage bucket created successfully:', this.BUSINESS_IMAGES_BUCKET);
      return true;
    } catch (error) {
      // Handle the case where bucket already exists in catch block too
      if (error.__isStorageError && (error.statusCode === '409' || error.status === 409)) {
        console.log('✅ Storage bucket already exists (caught):', this.BUSINESS_IMAGES_BUCKET);
        return true;
      }
      
      console.log('Create storage bucket error:', error);
      return false;
    }
  }

  // Get public URL for a business image
  getBusinessImageUrl(filePath) {
    try {
      if (!filePath) return null;
      
      const { data } = this.supabase.storage
        .from(this.BUSINESS_IMAGES_BUCKET)
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Get image URL error:', error);
      return null;
    }
  }

  // Special method to append image URL to business images array
  async addImageToBusiness(businessId, imageUrl) {
    try {
      console.log('Adding image to business using PostgreSQL array functions');
      console.log('Business ID:', businessId);
      console.log('Image URL:', imageUrl);
      
      // Validate that the URL is from our business-images bucket
      if (!imageUrl.includes('business-images')) {
        console.error('Invalid image URL - not from business-images bucket:', imageUrl);
        throw new Error('Image URL must be from the business-images storage bucket');
      }
      
      // First, try using the PostgreSQL RPC function
      let result;
      
      try {
        console.log('Attempting to use PostgreSQL RPC function...');
        result = await this.client
          .rpc('add_image_to_business', {
            business_id: businessId,
            image_url: imageUrl
          });
        
        if (result.error) {
          throw result.error;
        }
        
        console.log('✅ RPC function successful');
        
      } catch (rpcError) {
        console.log('RPC function failed, using manual array update. Error:', rpcError.message);
        
        // Fallback: manual array handling if RPC function doesn't exist
        const { data: business, error: fetchError } = await this.getBusinessById(businessId);
        if (fetchError || !business) {
          throw new Error(`Business not found: ${businessId}`);
        }
        
        // Ensure images is an array and append new URL
        const currentImages = Array.isArray(business.images) ? business.images : [];
        
        // Check if URL already exists to avoid duplicates
        if (currentImages.includes(imageUrl)) {
          console.log('Image URL already exists in business, skipping duplicate');
          return { data: business, error: null };
        }
        
        const updatedImages = [...currentImages, imageUrl];
        
        console.log('Current images:', currentImages);
        console.log('Adding new image:', imageUrl);
        console.log('Updated images array:', updatedImages);
        
        result = await this.client
          .from('business')
          .update({ images: updatedImages })
          .eq('id', businessId)
          .select()
          .single();
          
        if (result.error) {
          console.error('Manual array update error:', result.error);
          throw result.error;
        }
        
        console.log('✅ Manual array update successful');
      }
      
      console.log('✅ Image URL successfully added to business database');
      console.log('Final result:', result.data);
      
      return { data: result.data, error: null };
      
    } catch (error) {
      console.error('❌ Add image to business service error:', error);
      return { data: null, error };
    }
  }

  // Method to remove image URL from business
  async removeImageFromBusiness(businessId, imageUrl) {
    try {
      console.log('Removing image from business:', businessId, imageUrl);
      
      const { data, error } = await this.client
        .rpc('remove_image_from_business', {
          business_id: businessId,
          image_url: imageUrl
        })
        .catch(async () => {
          // Fallback: manual array handling
          const { data: business, error: fetchError } = await this.getBusinessById(businessId);
          if (fetchError || !business) {
            throw new Error('Business not found');
          }
          
          const currentImages = Array.isArray(business.images) ? business.images : [];
          const updatedImages = currentImages.filter(url => url !== imageUrl);
          
          return await this.client
            .from('business')
            .update({ images: updatedImages })
            .eq('id', businessId)
            .select()
            .single();
        });
      
      if (error) throw error;
      
      console.log('Image removed from business successfully');
      return { data, error: null };
    } catch (error) {
      console.error('Remove image from business error:', error);
      return { data: null, error };
    }
  }

  // Get businesses with image counts
  async getAllBusinessesWithImageCount() {
    try {
      const { data, error } = await this.client
        .rpc('get_businesses_with_image_count')
        .catch(async () => {
          // Fallback: manual query
          const { data, error } = await this.client
            .from('business')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          
          // Add image count manually
          return {
            data: data.map(business => ({
              ...business,
              image_count: business.images ? business.images.length : 0
            }))
          };
        });
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Get businesses with image count error:', error);
      return { data: null, error };
    }
  }

  // Get client instances (for advanced operations)
  getClient() {
    return this.client
  }

  getAdminClient() {
    return this.adminClient
  }
}

// Create and export a singleton instance
const supabaseService = new SupabaseService()

// Initialize service - test connection and prepare storage
const initializeService = async () => {
  console.log('🚀 Initializing Supabase service...');
  
  // Test connection
  await supabaseService.testConnection();
  
  // Initialize storage bucket
  console.log('📦 Preparing storage bucket...');
  await supabaseService.createStorageBucket();
  supabaseService._bucketChecked = true;
  
  console.log('✅ Supabase service ready!');
};

// Initialize on startup (non-blocking)
initializeService().catch(error => {
  console.error('❌ Failed to initialize Supabase service:', error);
});

export default supabaseService

// Export individual clients for backward compatibility
export const supabase = supabaseService.getClient()
export const supabaseAdmin = supabaseService.getAdminClient()
