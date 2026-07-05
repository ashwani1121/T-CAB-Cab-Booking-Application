import React, { useState, useEffect } from "react"
import axios from "../utils/axios"
import { toast } from "react-toastify"
import Layout from "./Layout"
import { useTheme } from "../context/themeContext"
import { ThemeUI } from "../context/themeUI"
import { ChevronRight, Loader } from "lucide-react"

function MasterSettings(){
    const { theme }                 = useTheme()
    const [formData, setFormData]   = useState(null)
    const [errors, setErrors]       = useState({})
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        const fetchMasterSettings = async () => {
            try{
                const response = await axios.get(`/admin/master-settings`)
                const settings = response.data.data
                setFormData({
                    subscriptionActivate: settings.subscription_activate || "no",
                    otpProvider: settings.otp_provider || "msg91"
                })
            }catch(err){
                const errorMessage = err.response?.data?.message || "Failed to load master settings."
                toast.error(errorMessage)
                setFormData({
                    subscriptionActivate: "no",
                    otpProvider: "msg91"
                })
            }
        }
        fetchMasterSettings()
    }, [])

    const handleSelectChange = (selectedOption, actionMeta) => {
        setFormData({
            ...formData,
            [actionMeta.name]: selectedOption.value,
        })
        setErrors((prev) => ({ ...prev, [actionMeta.name]: "" }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        try{
            // Send as JSON instead of FormData
            const response = await axios.post(`/admin/master-settings`, {
                subscriptionActivate: formData.subscriptionActivate,
                otpProvider: formData.otpProvider
            }, {
                headers: {
                    "Content-Type": "application/json",
                }
            })
            toast.success(response.data.message || "Master settings saved successfully!")
            setErrors({})
        }catch(err){
            if(err.response && err.response.data.errors){
                const apiErrors = err.response.data.errors
                const formattedErrors = {}
                if(apiErrors.subscription_activate) formattedErrors.subscriptionActivate = apiErrors.subscription_activate
                if(apiErrors.otp_provider) formattedErrors.otpProvider = apiErrors.otp_provider;
                setErrors(formattedErrors)
                toast.error("Please fix the errors in the form.")
            }else{
                const errorMessage = err.response?.data?.message || "Failed to save master settings. Please try again."
                setErrors({ server: errorMessage })
                toast.error(errorMessage)
            }
        }finally{
            setIsLoading(false)
        }
    }

    if(!formData){
        return (
            <Layout>
                <div className="flex items-center justify-center h-64">
                    <Loader className="animate-spin h-8 w-8 text-gray-500" />
                </div>
            </Layout>
        )
    }

    return(
        <Layout>
            <div className="flex flex-row justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Master Settings</h1>
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
                            Master Settings
                        </li>
                    </ol>
                </nav>
            </div>
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-6">
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <ThemeUI.FormField
                            label="Subscription Activate"
                            name="subscriptionActivate"
                            error={errors.subscriptionActivate}
                            required={true}
                        >
                            <ThemeUI.Select
                                id="subscriptionActivate"
                                name="subscriptionActivate"
                                value={formData.subscriptionActivate}
                                onChange={handleSelectChange}
                                options={[
                                    { value: "yes", label: "Yes" },
                                    { value: "no", label: "No" },
                                ]}
                                placeholder="Select option"
                                error={errors.subscriptionActivate}
                                isSearchable={false}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                If activated, subscription features will be available in the app.
                            </p>
                        </ThemeUI.FormField>
                        <ThemeUI.FormField
                            label="OTP Provider"
                            name="otpProvider"
                            error={errors.otpProvider}
                            required={true}
                        >
                            <ThemeUI.Select
                                id="otpProvider"
                                name="otpProvider"
                                value={formData.otpProvider}
                                onChange={handleSelectChange}
                                options={[
                                    { value: "msg91", label: "Msg91" },
                                    { value: "combirds", label: "Combirds" },
                                ]}
                                placeholder="Select OTP provider"
                                error={errors.otpProvider}
                                isSearchable={false}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Select the OTP service provider used for sending verification codes.
                            </p>
                        </ThemeUI.FormField>
                    </div>
                </div>
                {errors.server && (
                    <div className="text-red-500 text-sm mt-2">{errors.server}</div>
                )}
                <div className="flex justify-end">
                    <ThemeUI.Button
                        type="submit"
                        loading={isLoading}
                        gradientColors={{
                            start: theme.primaryGradientStart,
                            end: theme.primaryGradientEnd,
                        }}
                        direction={theme.gradientDirection}
                    >
                        {isLoading ? (
                            <div className="flex items-center space-x-2">
                                <Loader className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                                <span>Saving...</span>
                            </div>
                        ) : (
                            "Save Changes"
                        )}
                    </ThemeUI.Button>
                </div>
            </form>
        </Layout>
    )
}

export default MasterSettings