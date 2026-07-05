import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldX, Home } from 'lucide-react';
import { useTheme } from '../context/themeContext';
function Unauthorized(){
    const navigate  = useNavigate();
    const { theme } = useTheme();
    return(
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-2">
            <div className="max-w-md w-full text-center">
                {/* Icon */}
                <div className="mb-4 flex justify-center">
                    <div 
                        className="w-24 h-24 rounded-full flex items-center justify-center"
                        style={{ 
                        backgroundColor: `${theme.primaryGradientStart}15`
                        }}
                    >
                        <ShieldX 
                        size={48} 
                        style={{ color: theme.primaryGradientStart }}
                        />
                    </div>
                </div>
                {/* Heading */}
                <h1 className="text-3xl font-bold text-gray-800 ">
                    Access Denied
                </h1>
  
                {/* Message */}
                <p className="text-gray-600 m-4">
                    You don't have permission to access this module.
                </p>
                {/* Action Button */}
                <button
                    onClick={() => navigate('/dashboard')}
                    className="inline-flex items-center gap-2 px-6 py-3 text-white rounded-lg font-medium transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5"
                    style={{
                        background: `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})`
                    }}
                >
                    <Home size={20} />
                    Back to Dashboard
                </button>
                {/* Additional Info */}
                <div className="mt-8 p-4 bg-gray-100 rounded-lg">
                    <p className="text-sm text-gray-600">
                        <span className="font-semibold">Need access?</span> Contact your system administrator to request permissions for this module.
                    </p>
                </div>
            </div>
        </div>
    );
}
export default Unauthorized;