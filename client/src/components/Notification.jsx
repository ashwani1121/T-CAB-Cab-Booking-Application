import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import Layout from "./Layout";
import { useTheme } from "../context/themeContext";
import { ThemeUI } from "../context/themeUI";
import { ChevronRight, X } from "lucide-react";
import Modal from "./Modal";

const INITIAL_FORM_STATE = {
    role: "",
    sendTo: "",
    specificUsers: [],
    title: "",
    message: "",
};

function Notification() {
    const { theme }                         = useTheme();
    const [isLoading, setIsLoading]         = useState(false);
    const [roles, setRoles]                 = useState([]);
    const [userCount, setUserCount]         = useState(0);
    const [backendErrors, setBackendErrors] = useState({});
    const [formData, setFormData]           = useState(INITIAL_FORM_STATE);
    const [showPreview, setShowPreview]     = useState(false);
    const API_BASE                          = useMemo(() => import.meta.env.VITE_API_URL, []);

    // Fetch roles on mount with error handling
    useEffect(() => {
        let isMounted    = true;
        const fetchRoles = async () => {
            try{
                const response = await axios.get(`${API_BASE}/admin/notification/roles`);
                if(isMounted && response.data.success){
                    setRoles(response.data.data);
                }
            }catch(err){
                if(isMounted){
                    console.error("Error fetching roles:", err);
                    toast.error("Failed to fetch roles. Please refresh the page.");
                }
            }
        };
        fetchRoles();
        return () => { isMounted = false; };
    }, [API_BASE]);

    // Fetch user count when role changes 
    useEffect(() => {
        let isMounted = true;
        let timeoutId;
        const fetchUserCount = async () => {
            if(!formData.role){
                setUserCount(0);
                return;
            }
            try{
                const response = await axios.get(
                    `${API_BASE}/admin/notification/${formData.role}/count`
                );
                if(isMounted && response.data.success){
                    setUserCount(response.data.data.count);
                }
            }catch(err){
                if(isMounted){
                    console.error("Error fetching user count:", err);
                    setUserCount(0);
                }
            }
        };
        // Debounce the API call
        timeoutId = setTimeout(fetchUserCount, 300);
        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, [formData.role, API_BASE]);

    // Optimized autocomplete function with caching and debouncing
    const loadUserOptions = useCallback(async (inputValue, callback) => {
        if(!formData.role){
            callback([]);
            return;
        }
        try{
            const response = await axios.get(
                `${API_BASE}/admin/notification/${formData.role}/search`,
                {
                    params: { q: inputValue || '' },
                    timeout: 5000 // 5 second timeout
                }
            );
            if(response.data.success){
                const options = response.data.data.map(user => ({
                    value: user.id,
                    label: user.name,
                    user : user 
                }));
                callback(options);
            }else{
                callback([]);
            }
        }catch(err){
            console.error("Error searching users:", err);
            if(err.code === 'ECONNABORTED'){
                toast.error("Search request timed out. Please try again.");
            }
            callback([]);
        }
    }, [formData.role, API_BASE]);

    // Handle form submission with optimized error handling
    const handleSubmit = async (e) => {
        e.preventDefault();
        try{
            setIsLoading(true);
            setBackendErrors({});
            const response = await axios.post(
                `${API_BASE}/admin/notification/send`,
                {
                    ...formData,
                    title  : formData.title.trim(),
                    message: formData.message.trim()
                },
                { timeout: 30000 } // 30 second timeout for send operation
            );
            if(response.data.success){
                toast.success(
                    `Notification sent successfully to ${
                        formData.sendTo === 'all' 
                            ? `all ${userCount} users` 
                            : `${formData.specificUsers.length} selected users`
                    }!`
                );
                setFormData(INITIAL_FORM_STATE);
                setUserCount(0);
            }
        }catch(err){
            console.error("Error sending notification:", err);
            if(err.response?.data?.errors){
                setBackendErrors(err.response.data.errors);
                toast.error("Please fix the form errors");
            }else 
            if(err.code === 'ECONNABORTED'){
                toast.error("Request timed out. Please try again.");
            }else{
                const errorMessage = err.response?.data?.message || "Failed to send notification";
                toast.error(errorMessage);
            }
        }finally{
            setIsLoading(false);
        }
    };

    // Notification Preview Component - Updated to use current formData
    const NotificationPreview = React.memo(() => {
        const currentTitle    = formData.title.trim() || "Notification Title";
        const currentMessage  = formData.message.trim() || "Your notification message will appear here...";
        return(
            <div className="space-y-6">
                <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">How it will appear on mobile devices:</h4>
                    {/* Light Theme Preview */}
                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                        <p className="text-xs text-gray-500 mb-2">Light theme</p>
                        <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                            <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-sm font-medium">📢</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            {currentTitle}
                                        </p>
                                        <span className="text-xs text-gray-500">now</span>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1 line-clamp-3">
                                        {currentMessage}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Dark Theme Preview */}
                    <div className="bg-gray-900 p-4 rounded-lg">
                        <p className="text-xs text-gray-400 mb-2">Dark theme</p>
                        <div className="bg-gray-800 rounded-lg p-4 text-white border border-gray-700">
                            <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                                    <span className="text-white text-sm">📢</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium truncate">
                                            {currentTitle}
                                        </p>
                                        <span className="text-xs text-gray-400">now</span>
                                    </div>
                                    <p className="text-sm text-gray-300 mt-1 line-clamp-3">
                                        {currentMessage}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    });

    // Update form field with error clearing
    const updateFormField = useCallback((field, value, clearFields = []) => {
        setFormData(prev => ({
            ...prev,
            [field]: value,
            ...clearFields.reduce((acc, clearField) => ({ ...acc, [clearField]: [] }), {})
        }));
        // Clear related errors
        const errorsToClear = [field, ...clearFields];
        setBackendErrors(prev => 
            errorsToClear.reduce((acc, errorField) => ({ ...acc, [errorField]: "" }), { ...prev })
        );
    }, []);

    // Memoized role options
    const roleOptions = useMemo(() => 
        roles.map(role => ({ value: role.id, label: role.name })), 
        [roles]
    );

    // Memoized send to options with user count
    const sendToOptions = useMemo(() => [
        { 
            value: "all", 
            label: `All Users${userCount > 0 ? ` (${userCount})` : ''}` 
        },
        { value: "specific", label: "Specific Users" }
    ], [userCount]);

    // Handle Preview button click
    const handlePreviewClick = () => {
        setShowPreview(true);
    };

    return(
        <Layout>
            {/* Header and breadcrumb */}
            <div className="flex flex-row justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Broadcast Notifications</h1>
                <nav className="flex items-center text-sm text-gray-500 whitespace-nowrap overflow-x-auto">
                    <ol className="flex items-center">
                        <li>
                            <a href="/dashboard" className="hover:text-blue-600 transition-colors">
                                Home
                            </a>
                        </li>
                        <li className="flex items-center">
                            <ChevronRight className="h-4 w-4 mx-1" />
                        </li>
                        <li style={{ color: theme.primaryGradientStart }} className="font-medium">
                            Notification
                        </li>
                    </ol>
                </nav>
            </div>
            {/* Form */}
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-6">
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ThemeUI.FormField
                            label           = "Recipient Role"
                            name            = "role"
                            error           = {backendErrors.role}
                            required        = {true}
                        >
                            <ThemeUI.Select
                                id          = "role"
                                name        = "role"
                                value       = {formData.role}
                                onChange    = {(selectedOption) => {
                                    updateFormField('role', selectedOption?.value || "", ['specificUsers']);
                                }}
                                options     = {roleOptions}
                                placeholder = "Select role"
                                error       = {backendErrors.role}
                                isDisabled  = {isLoading}
                            />
                        </ThemeUI.FormField>
                        <ThemeUI.FormField
                            label           = "Send To"
                            name            = "sendTo"
                            error           = {backendErrors.sendTo}
                            required        = {true}
                        >
                            <ThemeUI.Select
                                id          = "sendTo"
                                name        = "sendTo"
                                value       = {formData.sendTo}
                                onChange    = {(selectedOption) => {
                                    updateFormField('sendTo', selectedOption?.value || "", ['specificUsers']);
                                }}
                                options     = {sendToOptions}
                                placeholder = "Select option"
                                error       = {backendErrors.sendTo}
                                isDisabled  = {!formData.role || isLoading}
                            />
                        </ThemeUI.FormField>
                    </div>
                    {/* Conditional User Selection */}
                    {formData.sendTo === "specific" && (
                        <div className="grid grid-cols-1 gap-6">
                            <ThemeUI.FormField
                                label       = "Select Users"
                                name        = "specificUsers"
                                error       = {backendErrors.specificUsers}
                                required    = {true}
                                helpText    = {`Selected: ${formData.specificUsers.length} users`}
                            >
                                <ThemeUI.AutoComplete
                                    id      = "specificUsers"
                                    name    = "specificUsers"
                                    value   = {formData.specificUsers}
                                    onChange         = {(selectedOptions) => {
                                        updateFormField('specificUsers', selectedOptions || []);
                                    }}
                                    loadOptions      = {loadUserOptions}
                                    placeholder      = "Type at least 2 characters to search users..."
                                    isMulti          = {true}
                                    isDisabled       = {!formData.role || isLoading}
                                    error            = {backendErrors.specificUsers}
                                    cacheOptions     = {true}
                                    defaultOptions   = {false}
                                    noOptionsMessage = {({ inputValue }) => {
                                        if (!inputValue) return "Type to search users";
                                        if (inputValue.length < 2) return "Type at least 2 characters";
                                        return "No users found";
                                    }}
                                    minInputLength   = {2}
                                    debounceDelay    = {300}
                                    closeMenuOnSelect= {false}
                                />
                            </ThemeUI.FormField>
                        </div>
                    )}
                    <div className="grid grid-cols-1 gap-6">
                        <ThemeUI.FormField
                            label="Notification Title"
                            name="title"
                            error={backendErrors.title}
                            required={true}
                            helpText={`${formData.title.length}/50 characters (recommended for better visibility)`}
                        >
                            <ThemeUI.Input
                                id="title"
                                name="title"
                                type="text"
                                value={formData.title}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if(value.length <= 100){ // Allow more than 50 but warn
                                        updateFormField('title', value);
                                    }
                                }}
                                placeholder="Enter notification title (e.g., Important Update, New Feature Available)"
                                error={backendErrors.title}
                                disabled={isLoading}
                                maxLength={100}
                            />
                        </ThemeUI.FormField>
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                        <ThemeUI.FormField
                            label    = "Notification Message"
                            name     = "message"
                            error    = {backendErrors.message}
                            required = {true}
                            helpText = {`${formData.message.length}/500 characters`}
                        >
                            <ThemeUI.Textarea
                                id       = "message"
                                name     = "message"
                                value    = {formData.message}
                                onChange = {(e) => {
                                    const value = e.target.value;
                                    if(value.length <= 500){ // Character limit
                                        updateFormField('message', value);
                                    }
                                }}
                                placeholder = "Enter notification message (max 500 characters)"
                                rows        = {4}
                                error       = {backendErrors.message}
                                disabled    = {isLoading}
                                maxLength   = {500}
                            />
                        </ThemeUI.FormField>
                    </div>
                    
                    {/* Submit Button */}
                    <div className="flex justify-end space-x-4">
                        <ThemeUI.Button
                            type="button"
                            onClick={handlePreviewClick}
                            disabled={!formData.title && !formData.message}
                            gradientColors={{
                                start: theme.secondaryGradientStart,
                                end: theme.secondaryGradientEnd,
                            }}
                            direction={theme.gradientDirection}
                        >
                            Preview
                        </ThemeUI.Button>
                        <ThemeUI.Button
                            type     = "submit"
                            loading  ={ isLoading}
                            disabled = {!formData.role || !formData.sendTo || !formData.message.trim()}
                        >
                            {isLoading ? "Sending..." : "Send Notification"}
                        </ThemeUI.Button>
                    </div>
                </div>
            </form>
            {/* Preview Modal - Now with live updates */}
            <Modal
                isOpen  = {showPreview}
                onClose = {() => setShowPreview(false)}
                title   = "Notification Preview"
                size    = "lg"
            >
                <NotificationPreview />
            </Modal>
        </Layout>
    );
}
export default Notification;