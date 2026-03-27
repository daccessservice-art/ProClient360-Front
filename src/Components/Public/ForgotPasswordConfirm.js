import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./login.css"; // Ensure this path is correct
import toast from "react-hot-toast";
import { resetPassword } from "../../hooks/useAuth";

export const ForgotPasswordConfirm = () => {
  const navigation = useNavigate();
  const { id, token } = useParams();

  const [confirmPass, setConfirmPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState({ new: false, confirm: false });

  // Fix Typo: handel -> handle
  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (newPass !== confirmPass) {
      return toast.error("New Password and Confirm Password do not match...");
    }

    try {
      setLoading(true);
      await resetPassword(id, token, newPass, confirmPass);
      toast.success("Password changed successfully!");
      setConfirmPass('');
      setNewPass('');
      navigation('/');
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while resetting the password.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const elements = document.querySelectorAll('.slide-in');
    elements.forEach((el, index) => {
      setTimeout(() => {
        el.style.animationPlayState = 'running';
      }, index * 100);
    });
  }, []);

  // Icons
  const ShieldIcon = () => (
    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
    </svg>
  );

  const KeyIcon = () => (
    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd"></path>
    </svg>
  );

  const EyeIcon = () => (
    <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"></path>
      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"></path>
    </svg>
  );

  const EyeOffIcon = () => (
    <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd"></path>
      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z"></path>
    </svg>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 overflow-hidden relative font-[Inter] loginbody_text">
      <div className="absolute inset-0 wave"></div>
      {[...Array(9)].map((_, i) => (
        <div key={i} className="particle" style={{ left: `${10 * (i + 1)}%`, animationDelay: `${(i * 2) % 12}s` }}></div>
      ))}

      <div className="min-h-screen flex items-center justify-center px-4 relative z-10">
        <div className="max-w-6xl w-full grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Side */}
          <div className="hidden lg:block relative">
            <div className="text-center space-y-8">
              <h1 className="text-5xl font-bold text-gray-800 slide-in" style={{ animationDelay: '0.2s' }}>
                Forgot Your <span className="text-blue-600">Password</span>
              </h1>
              <p className="text-xl text-gray-600 slide-in" style={{ animationDelay: '0.4s' }}>
                Keep your account safe with a strong, unique password.
              </p>
              <div className="relative h-96 slide-in" style={{ animationDelay: '0.6s' }}>
                <div className="floating-icon absolute top-10 left-10 bg-blue-500 p-4 rounded-2xl shadow-lg">
                  <ShieldIcon />
                </div>
              </div>
            </div>
          </div>

          {/* Right Side */}
          <div className="w-full max-w-md mx-auto">
            <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 slide-in" style={{ animationDelay: '0.3s' }}>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
                  <KeyIcon />
                </div>
                <h2 className="text-3xl font-bold text-gray-800">Reset Password</h2>
                <p className="text-gray-600 mt-2">Enter your new password below</p>
              </div>
              
              <form className="space-y-6" onSubmit={handleChangePassword}>

                {/* New Password Input */}
                <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path>
                    </svg>
                  </div>
                  <input
                    type={showPassword.new ? 'text' : 'password'}
                    className="input-focus w-full pl-12 pr-12 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50"
                    placeholder='New Password'
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    required
                  />
                  <button type="button" className="absolute inset-y-0 right-0 pr-4 flex items-center" onClick={() => setShowPassword(prev => ({ ...prev, new: !prev.new }))}>
                    {showPassword.new ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>

                {/* Confirm Password Input */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path>
                    </svg>
                  </div>
                  <input
                    type={showPassword.confirm ? 'text' : 'password'}
                    className="input-focus w-full pl-12 pr-12 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50/50"
                    placeholder='Confirm Password'
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    required
                  />
                  <button type="button" className="absolute inset-y-0 right-0 pr-4 flex items-center" onClick={() => setShowPassword(prev => ({ ...prev, confirm: !prev.confirm }))}>
                    {showPassword.confirm ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>

                <button 
                  type="submit" 
                  className="btn-hover w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-2xl font-semibold text-lg shadow-lg flex items-center justify-center"
                  disabled={loading}
                >
                  {loading ? "Processing..." : "Change Password"}
                </button>

              </form>

              <div className="text-center mt-6">
                <button onClick={() => navigation('/')} className="text-blue-600 hover:underline text-sm font-medium">
                   <i className="fa-solid fa-angle-left mr-1"></i> Back to Home page
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};