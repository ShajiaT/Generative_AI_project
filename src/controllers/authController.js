// src/controllers/authController.js
import supabaseService from "../services/supabaseService.js";

export const signup = async (req, res) => {
  const { email, password, business_name, industry } = req.body;

  try {
    // Input validation
    if (!email || !password || !business_name || !industry) {
      return res.status(400).json({ 
        error: "All fields are required: email, password, business_name, industry" 
      });
    }

    console.log('Creating user:', email);

    // 1️⃣ Create user using the service
    const { user, error } = await supabaseService.createUser(email, password);

    if (error) {
      console.error("User creation error:", error);
      return res.status(400).json({ error: error.message });
    }

    console.log('User created successfully:', user.id);

    // 2️⃣ Create profile using the service
    const profileData = {
      user_id: user.id,
      business_name,
      industry,
    };

    const { data: profileResult, error: profileError } = await supabaseService.createProfile(profileData);

    if (profileError) {
      console.error("Profile creation error:", profileError);
      return res.status(400).json({ error: "Failed to create user profile" });
    }

    console.log('Profile created successfully');

    res.status(200).json({
      message: "Signup successful",
      user: { 
        id: user.id, 
        email: user.email,
        business_name,
        industry
      },
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Input validation
    if (!email || !password) {
      return res.status(400).json({ 
        error: "Email and password are required" 
      });
    }

    console.log('Attempting login for:', email);

    const { data, error } = await supabaseService.signInUser(email, password);

    if (error) {
      console.error("Login error:", error);
      return res.status(400).json({ error: error.message });
    }

    console.log('Login successful for:', email);

    res.status(200).json({ 
      message: "Login successful", 
      token: data.session.access_token,
      user: data.user
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getProfile = async (req, res) => {
  const user = req.user; // set by authMiddleware

  try {
    console.log('Getting profile for user:', user.id);

    const { data, error } = await supabaseService.getProfile(user.id);

    if (error) {
      console.error("Get profile error:", error);
      return res.status(400).json({ error: error.message });
    }

    console.log('Profile retrieved successfully');

    res.status(200).json({ profile: data });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};