import React, { useState, useEffect } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import Layout from "./Layout"
import { useTheme } from "../context/themeContext"
import { ThemeUI } from "../context/themeUI"
import { ChevronRight, User, Truck, Shield, Monitor, Layers, Palette, Loader, Cog, Info, BookX } from "lucide-react"
function Settings(){
	const { theme, updateTheme } 						  = useTheme()
	const [activeMainTab, setActiveMainTab] 			  = useState("user")
	const [activeSubTab, setActiveSubTab] 				  = useState("website")
	const [formData, setFormData] 						  = useState(null)
	const [logoPreview, setLogoPreview] 				  = useState(null)
	const [onboardImgOnePreview, setOnboardImgOnePreview] = useState(null)
	const [onboardImgTwoPreview, setOnboardImgTwoPreview] = useState(null)
	const [errors, setErrors] 							  = useState({})
	const [isLoading, setIsLoading] 					  = useState(false)
	const [roles, setRoles]   	                	      = useState([])
	const [deleteFields, setDeleteFields] 				  = useState({
		logo											  : false,
		onboardImgOne									  : false,
		onboardImgTwo									  : false,
	})
	const gradientDirections = [
		{ value: "to right", label: "Left to Right" },
		{ value: "to left", label: "Right to Left" },
		{ value: "to bottom", label: "Top to Bottom" },
		{ value: "to top", label: "Bottom to Top" },
		{ value: "to bottom right", label: "Top Left to Bottom Right" },
		{ value: "to bottom left", label: "Top Right to Bottom Left" },
		{ value: "to top right", label: "Bottom Left to Top Right" },
		{ value: "to top left", label: "Bottom Right to Top Left" },
	]
	const handleMainTabChange = (tabId) => {
		setActiveMainTab(tabId)
		setActiveSubTab("website") 
	}
	const findTabWithErrors = (errors) => {
		const errorFields   = Object.keys(errors)
		const websiteFields = ['companyName', 'companyEmail', 'companyPhone', 'companyAddress', 'logo']
		const onboardFields = ['onboardImgOne', 'onboardOneTitle', 'onboardOneDescription', 'onboardImgTwo', 'onboardTwoTitle', 'onboardTwoDescription']
		const colorFields   = ['primaryGradientStart', 'primaryGradientEnd', 'secondaryGradientStart', 'secondaryGradientEnd', 'sidebarGradientStart', 'sidebarGradientEnd', 'gradientDirection']
		const privacyFields = ['privacyPolicy']
		const consentFields = ['consentForm']
		const fareFields    = ['fareAndChargesPolicy']
		const reservationFields = ['reservationPolicy'] 
		const configFields  = ['commissionType', 'bookAnyVehicle', 'maxCancellationsPerDay', 'cancellationChargePercent','maxCancellationAmt', 'transferTimeFrom', 'transferTimeTo', 'walletNegativeLimit','complainAssignableRoles','complainEscalationRoles']
		if(errorFields.some(field => websiteFields.includes(field))) return 'website'
		if(errorFields.some(field => privacyFields.includes(field))) return 'privacy'
		if(errorFields.some(field => consentFields.includes(field))) return 'consent'
		if(errorFields.some(field => fareFields.includes(field))) return 'fare-charges'
		if(errorFields.some(field => reservationFields.includes(field))) return 'reservation'  
		if(errorFields.some(field => onboardFields.includes(field))) return 'onboard'
		if(errorFields.some(field => colorFields.includes(field))) return 'colors'
		if(errorFields.some(field => configFields.includes(field))) return 'configuration'
		return null
	}

	useEffect(() => {
		const initializeTheme = async () => {
			try{
				const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/settings`,{
					params: { role: "admin" },
				})
				const settings 	    = response.data.data
				const adminGradient = {
					primaryGradientStart   : settings.primary_gradient_start || "#4F46E5",
					primaryGradientEnd	   : settings.primary_gradient_end || "#7C3AED",
					secondaryGradientStart : settings.secondary_gradient_start || "#0EA5E9",
					secondaryGradientEnd   : settings.secondary_gradient_end || "#2DD4BF",
					sidebarGradientStart   : settings.sidebar_gradient_start || "#4F46E5",
					sidebarGradientEnd     : settings.sidebar_gradient_end || "#7C3AED",
					gradientDirection      : settings.gradient_direction || "to right",
				}
				const storedAdminSettings = JSON.parse(localStorage.getItem("adminColorSettings")) || {}
				const themeGradient = {
					primaryGradientStart:storedAdminSettings.primaryGradientStart || adminGradient.primaryGradientStart,
					primaryGradientEnd:storedAdminSettings.primaryGradientEnd || adminGradient.primaryGradientEnd,
					secondaryGradientStart:storedAdminSettings.secondaryGradientStart || adminGradient.secondaryGradientStart,
					secondaryGradientEnd:storedAdminSettings.secondaryGradientEnd || adminGradient.secondaryGradientEnd,
					sidebarGradientStart:storedAdminSettings.sidebarGradientStart || adminGradient.sidebarGradientStart,
					sidebarGradientEnd:storedAdminSettings.sidebarGradientEnd || adminGradient.sidebarGradientEnd,
					gradientDirection:storedAdminSettings.gradientDirection || adminGradient.gradientDirection,
				}
				updateTheme(themeGradient)
			}catch(err){
				const storedAdminSettings = JSON.parse(localStorage.getItem("adminColorSettings")) || {}
				const defaultGradient = {
					primaryGradientStart:storedAdminSettings.primaryGradientStart || "#4F46E5",
					primaryGradientEnd:storedAdminSettings.primaryGradientEnd || "#7C3AED",
					secondaryGradientStart:storedAdminSettings.secondaryGradientStart || "#0EA5E9",
					secondaryGradientEnd:storedAdminSettings.secondaryGradientEnd || "#2DD4BF",
					sidebarGradientStart:storedAdminSettings.sidebarGradientStart || "#4F46E5",
					sidebarGradientEnd:storedAdminSettings.sidebarGradientEnd || "#7C3AED",
					gradientDirection:storedAdminSettings.gradientDirection || "to right",
				}
				updateTheme(defaultGradient)
			}
		}
		const fetchSettings = async () => {
			try{
				const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/settings`,{
					params: { role: activeMainTab },
				})
				const settings 	   = response.data.data
				const formGradient = {
					primaryGradientStart: settings.primary_gradient_start || "#4F46E5",
					primaryGradientEnd: settings.primary_gradient_end || "#7C3AED",
					secondaryGradientStart:settings.secondary_gradient_start || "#0EA5E9",
					secondaryGradientEnd: settings.secondary_gradient_end || "#2DD4BF",
					sidebarGradientStart: settings.sidebar_gradient_start || "#4F46E5",
					sidebarGradientEnd: settings.sidebar_gradient_end || "#7C3AED",
					gradientDirection: settings.gradient_direction || "to right",
				}
				if(activeMainTab === "admin"){
					const storedAdminSettings = JSON.parse(localStorage.getItem("adminColorSettings")) || {}
					const themeGradient = {
						primaryGradientStart:storedAdminSettings.primaryGradientStart || formGradient.primaryGradientStart,
						primaryGradientEnd:storedAdminSettings.primaryGradientEnd || formGradient.primaryGradientEnd,
						secondaryGradientStart:storedAdminSettings.secondaryGradientStart || formGradient.secondaryGradientStart,
						secondaryGradientEnd:storedAdminSettings.secondaryGradientEnd || formGradient.secondaryGradientEnd,
						sidebarGradientStart:storedAdminSettings.sidebarGradientStart || formGradient.sidebarGradientStart,
						sidebarGradientEnd:storedAdminSettings.sidebarGradientEnd || formGradient.sidebarGradientEnd,
						gradientDirection:storedAdminSettings.gradientDirection || formGradient.gradientDirection,
					}
					if(
						themeGradient.primaryGradientStart !== theme.primaryGradientStart ||
						themeGradient.primaryGradientEnd !== theme.primaryGradientEnd ||
						themeGradient.secondaryGradientStart !==
						theme.secondaryGradientStart ||
						themeGradient.secondaryGradientEnd !== theme.secondaryGradientEnd ||
						themeGradient.sidebarGradientStart !== theme.sidebarGradientStart ||
						themeGradient.sidebarGradientEnd !== theme.sidebarGradientEnd ||
						themeGradient.gradientDirection !== theme.gradientDirection
					){
						updateTheme(themeGradient)
					}
				}
				setFormData({
					...formGradient,
					companyName:
						settings.company_name ||
						localStorage.getItem(`companyName_${activeMainTab}`) ||
						"",
					companyEmail:
						settings.company_email ||
						localStorage.getItem(`companyEmail_${activeMainTab}`) ||
						"",
					companyPhone:
						settings.company_phone ||
						localStorage.getItem(`companyPhone_${activeMainTab}`) ||
						"",
					companyAddress:
						settings.company_address ||
						localStorage.getItem(`companyAddress_${activeMainTab}`) ||
						"",
					logo: null,
					onboardImgOne: null,
					onboardImgTwo: null,
					onboardOneTitle: settings.onboard_title_one || "",
					onboardOneDescription: settings.onboard_desc_one || "",
					onboardTwoTitle: settings.onboard_title_two || "",
					onboardTwoDescription: settings.onboard_desc_two || "",
					privacyPolicy: settings.privacy_policy || "",
					consentForm: settings.consent_form || "",			
					fareAndChargesPolicy: activeMainTab === "driver" ? (settings.fare_charges_policy || "") : "",
					reservationPolicy: settings.reservation_policy || "",
					commissionType: settings.commission_type || "percentage", 
					bookAnyVehicle: settings.book_any_vehicle || "",
					maxCancellationsPerDay:settings.max_cancellations_per_day || "",
					cancellationChargePercent:settings.cancellation_charge_percent || "",
					maxCancellationAmt:settings.max_cancellation_amt || "",
					walletNegativeLimit: settings.wallet_negative_limit || "",
    				complainAssignableRoles: settings.complain_assignable_roles || "",
					complainEscalationRoles: settings.complain_escalation_roles || "",
					transferTimeFrom: activeMainTab === "admin" ? (settings.transfer_time_from || localStorage.getItem(`transferTimeFrom_${activeMainTab}`) || "") : "",
					transferTimeTo: activeMainTab === "admin" ? (settings.transfer_time_to || localStorage.getItem(`transferTimeTo_${activeMainTab}`) || "") : ""
				})
				if(settings.logo){
					setLogoPreview(settings.logo)
					localStorage.setItem(`companyLogo_${activeMainTab}`, settings.logo)
				}else{
					const storedLogo = localStorage.getItem(`companyLogo_${activeMainTab}`)
					if(storedLogo) setLogoPreview(storedLogo)
				}
				if(settings.onboard_img_one){
					setOnboardImgOnePreview(settings.onboard_img_one)
				}
				if(settings.onboard_img_two){
					setOnboardImgTwoPreview(settings.onboard_img_two)
				}
				if(settings.company_name){
					localStorage.setItem(`companyName_${activeMainTab}`,settings.company_name)
				}
				if(settings.company_email){
					localStorage.setItem(`companyEmail_${activeMainTab}`,settings.company_email)
				}
				if(settings.company_phone){
					localStorage.setItem(`companyPhone_${activeMainTab}`,settings.company_phone)
				}
				if(settings.company_Address){
					localStorage.setItem(`companyAddress_${activeMainTab}`,settings.company_address)
				}
				if(activeMainTab === "admin") {
					if(settings.transfer_time_from) {
						localStorage.setItem(`transferTimeFrom_${activeMainTab}`, settings.transfer_time_from)
					}
					if(settings.transfer_time_to) {
						localStorage.setItem(`transferTimeTo_${activeMainTab}`, settings.transfer_time_to)
					}
				}
			}catch(err){
				const errorMessage = err.response?.data?.message || "Failed to load settings."
				toast.error(errorMessage)
				const formGradient = {
					primaryGradientStart   : "#4F46E5",
					primaryGradientEnd     : "#7C3AED",
					secondaryGradientStart : "#0EA5E9",
					secondaryGradientEnd   : "#2DD4BF",
					sidebarGradientStart   : "#4F46E5",
					sidebarGradientEnd     : "#7C3AED",
					gradientDirection      : "to right"
				}
				setFormData({
					...formGradient,
					companyName:
						localStorage.getItem(`companyName_${activeMainTab}`) || "",
					companyEmail:
						localStorage.getItem(`companyEmail_${activeMainTab}`) || "",
					companyphone:
						localStorage.getItem(`companyPhone_${activeMainTab}`) || "",
					companyAddress:
						localStorage.getItem(`companyAddress_${activeMainTab}`) || "",
					logo: null,
					onboardImgOne: null,
					onboardImgTwo: null,
					onboardOneTitle: "",
					onboardOneDescription: "",
					onboardTwoTitle: "",
					onboardTwoDescription: "",
					fareAndChargesPolicy: "",
					bookAnyVehicle: "",
					maxCancellationsPerDay:"",
					cancellationChargePercent:"",
					maxCancellationAmt:"",
					walletNegativeLimit: "",
					transferTimeFrom: activeMainTab === "admin" ? (localStorage.getItem(`transferTimeFrom_${activeMainTab}`) || "") : "",
					transferTimeTo: activeMainTab === "admin" ? (localStorage.getItem(`transferTimeTo_${activeMainTab}`) || "") : ""
				})
				const storedLogo = localStorage.getItem(`companyLogo_${activeMainTab}`)
				if(storedLogo) setLogoPreview(storedLogo)
			}
		}
		const fetchRoles = async () => {
			try{
				const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/team/roles`)
				setRoles(response.data.data || [])
			}catch(err){
				toast.error("Failed to fetch roles")
				console.error("fetchRoles error:", err)
			}
		}
		if(!formData){
			initializeTheme()
		}
		fetchRoles()
		fetchSettings()
	}, [activeMainTab])

	const handleInputChange = (e) => {
		const { name, value } = e.target
		setFormData({
		...formData,
		[name]: value,
		})
		setErrors((prev) => ({ ...prev, [name]: "" }))
	}

	const handleSelectChange = (selectedOption, actionMeta) => {
		setFormData({
		...formData,
		[actionMeta.name]: selectedOption.value,
		})
		setErrors((prev) => ({ ...prev, [actionMeta.name]: "" }))
	}

	const handleFileChange = (e) => {
		const { name, files } = e.target
		if (files && files[0]) {
		setFormData({
			...formData,
			[name]: files[0],
		})
		if (name === "logo") {
			setLogoPreview(URL.createObjectURL(files[0]))
			setDeleteFields((prev) => ({ ...prev, logo: false }))
		} else if (name === "onboardImgOne") {
			setOnboardImgOnePreview(URL.createObjectURL(files[0]))
			setDeleteFields((prev) => ({ ...prev, onboardImgOne: false }))
		} else if (name === "onboardImgTwo") {
			setOnboardImgTwoPreview(URL.createObjectURL(files[0]))
			setDeleteFields((prev) => ({ ...prev, onboardImgTwo: false }))
		}
		setErrors((prev) => ({ ...prev, [name]: "" }))
		}
	}

	const handleDeleteImage = (fieldName) => {
		if (fieldName === "logo") {
		setLogoPreview(null)
		setDeleteFields((prev) => ({ ...prev, logo: true }))
		localStorage.removeItem(`companyLogo_${activeMainTab}`)
		document.getElementById("logo").value = ""
		} else if (fieldName === "onboardImgOne") {
		setOnboardImgOnePreview(null)
		setDeleteFields((prev) => ({ ...prev, onboardImgOne: true }))
		document.getElementById("onboardImgOne").value = ""
		} else if (fieldName === "onboardImgTwo") {
		setOnboardImgTwoPreview(null)
		setDeleteFields((prev) => ({ ...prev, onboardImgTwo: true }))
		document.getElementById("onboardImgTwo").value = ""
		}
		setFormData({
		...formData,
		[fieldName]: null,
		})
	}

	const handleSubmit = async (e) => {
		e.preventDefault()
		setIsLoading(true)
		try{
			const form = new FormData()
			form.append("role", activeMainTab)
			form.append("companyName", formData.companyName)
			form.append("companyEmail", formData.companyEmail)
			form.append("companyPhone", formData.companyPhone)
			form.append("companyAddress", formData.companyAddress)
			if(activeMainTab !== "admin"){
				form.append("onboardOneTitle", formData.onboardOneTitle)
				form.append("privacyPolicy", formData.privacyPolicy)
				form.append("consentForm", formData.consentForm)
				form.append("onboardOneDescription", formData.onboardOneDescription)
				form.append("onboardTwoTitle", formData.onboardTwoTitle)
				form.append("onboardTwoDescription", formData.onboardTwoDescription)
				if(activeMainTab === "driver"){
					form.append("fareAndChargesPolicy", formData.fareAndChargesPolicy)
				}
				if(formData.onboardImgOne){
					form.append("onboardImgOne", formData.onboardImgOne)
				}else
				if(deleteFields.onboardImgOne){
					form.append("deleteonboardImgOne", "true")
				}
				if(formData.onboardImgTwo){
					form.append("onboardImgTwo", formData.onboardImgTwo)
				}else 
				if(deleteFields.onboardImgTwo){
					form.append("deleteonboardImgTwo", "true")
				}
			}
			// Logo for all roles
			if(formData.logo){
				form.append("logo", formData.logo)
			}else 
			if(deleteFields.logo){
				form.append("deleteLogo", "true")
			}
			form.append("primaryGradientStart", formData.primaryGradientStart)
			form.append("primaryGradientEnd", formData.primaryGradientEnd)
			form.append("secondaryGradientStart", formData.secondaryGradientStart)
			form.append("secondaryGradientEnd", formData.secondaryGradientEnd)
			if(activeMainTab === "admin"){
				form.append("sidebarGradientStart", formData.sidebarGradientStart)
				form.append("sidebarGradientEnd", formData.sidebarGradientEnd)
				form.append("commissionType", formData.commissionType)
				form.append("bookAnyVehicle", formData.bookAnyVehicle)
				form.append("maxCancellationsPerDay", formData.maxCancellationsPerDay)
				form.append("cancellationChargePercent", formData.cancellationChargePercent)
				form.append("maxCancellationAmt",formData.maxCancellationAmt)
				form.append("walletNegativeLimit", formData.walletNegativeLimit)
				form.append("reservationPolicy", formData.reservationPolicy)
				form.append("transferTimeFrom", formData.transferTimeFrom)
				form.append("transferTimeTo", formData.transferTimeTo)
    			form.append("complainAssignableRoles", formData.complainAssignableRoles)
				form.append("complainEscalationRoles", formData.complainEscalationRoles)
			}
			form.append("gradientDirection", formData.gradientDirection)
			const response = await axios.post(`${import.meta.env.VITE_API_URL}/admin/settings`,form,{
				headers: {
					"Content-Type": "multipart/form-data",
				},
			})
			if(activeMainTab === "admin"){
				const themeGradient = {
					primaryGradientStart   : formData.primaryGradientStart,
					primaryGradientEnd	   : formData.primaryGradientEnd,
					secondaryGradientStart : formData.secondaryGradientStart,
					secondaryGradientEnd   : formData.secondaryGradientEnd,
					sidebarGradientStart   : formData.sidebarGradientStart,
					sidebarGradientEnd	   : formData.sidebarGradientEnd,
					gradientDirection	   : formData.gradientDirection,
				}
				updateTheme(themeGradient)
				localStorage.setItem("adminColorSettings", JSON.stringify(themeGradient))
				localStorage.setItem('companyName', formData.companyName)
				if(response.data.data.logo){
					localStorage.setItem('companyLogo', response.data.data.logo)
				}else{
					localStorage.removeItem('companyLogo')
				}
				localStorage.setItem(`transferTimeFrom_${activeMainTab}`, formData.transferTimeFrom)
				localStorage.setItem(`transferTimeTo_${activeMainTab}`, formData.transferTimeTo)
				window.dispatchEvent(new Event('storage'))
			}
			toast.success("Settings saved successfully!")
			setErrors({})
			setDeleteFields({
				logo	     : false,
				onboardImgOne: false,
				onboardImgTwo: false,
			})
			localStorage.setItem(`companyName_${activeMainTab}`, formData.companyName)
			localStorage.setItem(`companyEmail_${activeMainTab}`, formData.companyEmail)
			localStorage.setItem(`companyPhone_${activeMainTab}`, formData.companyPhone)
			localStorage.setItem(`companyAddress_${activeMainTab}`, formData.companyAddress)
			const settings = response.data.data
			if(settings.logo){
				setLogoPreview(settings.logo)
				localStorage.setItem(`companyLogo_${activeMainTab}`, settings.logo)
			}else{
				setLogoPreview(null)
				localStorage.removeItem(`companyLogo_${activeMainTab}`)
			}
			if(activeMainTab !== "admin"){
				if(settings.onboard_img_one){
					setOnboardImgOnePreview(settings.onboard_img_one)
				}else{
					setOnboardImgOnePreview(null)
				}
				if(settings.onboard_img_two){
					setOnboardImgTwoPreview(settings.onboard_img_two)
				}else{
					setOnboardImgTwoPreview(null)
				}
			}
		}catch(err){
			if(err.response && err.response.data.errors){
				const apiErrors = err.response.data.errors
				const formattedErrors = {}
				if(apiErrors.company_name) formattedErrors.companyName = apiErrors.company_name
				if(apiErrors.company_email) formattedErrors.companyEmail = apiErrors.company_email
				if(apiErrors.company_phone) formattedErrors.companyPhone = apiErrors.company_phone
				if(apiErrors.company_address) formattedErrors.companyAddress = apiErrors.company_address
				if(apiErrors.logo) formattedErrors.logo = apiErrors.logo
				if(apiErrors.onboard_img_one) formattedErrors.onboardImgOne = apiErrors.onboard_img_one
				if(apiErrors.onboard_title_one) formattedErrors.onboardOneTitle = apiErrors.onboard_title_one
				if(apiErrors.onboard_desc_one) formattedErrors.onboardOneDescription = apiErrors.onboard_desc_one
				if(apiErrors.onboard_img_two) formattedErrors.onboardImgTwo = apiErrors.onboard_img_two
				if(apiErrors.onboard_title_two) formattedErrors.onboardTwoTitle = apiErrors.onboard_title_two
				if(apiErrors.onboard_desc_two) formattedErrors.onboardTwoDescription = apiErrors.onboard_desc_two
				if(apiErrors.primary_gradient_start) formattedErrors.primaryGradientStart = apiErrors.primary_gradient_start
				if(apiErrors.primary_gradient_end) formattedErrors.primaryGradientEnd = apiErrors.primary_gradient_end
				if(apiErrors.secondary_gradient_start) formattedErrors.secondaryGradientStart = apiErrors.secondary_gradient_start
				if(apiErrors.secondary_gradient_end) formattedErrors.secondaryGradientEnd = apiErrors.secondary_gradient_end
				if(apiErrors.sidebar_gradient_start) formattedErrors.sidebarGradientStart = apiErrors.sidebar_gradient_start
				if(apiErrors.sidebar_gradient_end) formattedErrors.sidebarGradientEnd = apiErrors.sidebar_gradient_end
				if(apiErrors.privacy_policy) formattedErrors.privacyPolicy = apiErrors.privacy_policy
				if(apiErrors.consentForm) formattedErrors.consentForm = apiErrors.consent_form
				if(apiErrors.fare_charges_policy) formattedErrors.fareAndChargesPolicy = apiErrors.fare_charges_policy
				if(apiErrors.commission_type) formattedErrors.commissionType = apiErrors.commission_type
				if(apiErrors.bookAnyVehicle) formattedErrors.bookAnyVehicle = apiErrors.bookAnyVehicle
				if(apiErrors.maxCancellationsPerDay) formattedErrors.maxCancellationsPerDay = apiErrors.maxCancellationsPerDay;
				if(apiErrors.cancellationChargePercent) formattedErrors.cancellationChargePercent = apiErrors.cancellationChargePercent;
				if(apiErrors.maxCancellationAmt) formattedErrors.maxCancellationAmt = apiErrors.maxCancellationAmt;
				if(apiErrors.wallet_negative_limit) formattedErrors.walletNegativeLimit = apiErrors.wallet_negative_limit;
				if(apiErrors.privacy_policy) formattedErrors.privacyPolicy = apiErrors.privacy_policy
				if(apiErrors.consent_form) formattedErrors.consentForm = apiErrors.consent_form
				if(apiErrors.reservation_policy) formattedErrors.reservationPolicy = apiErrors.reservation_policy
				if(apiErrors.transfer_time_from) formattedErrors.transferTimeFrom = apiErrors.transfer_time_from
				if(apiErrors.transfer_time_to) formattedErrors.transferTimeTo = apiErrors.transfer_time_to
				if(apiErrors.complain_assignable_roles) formattedErrors.complainAssignableRoles = apiErrors.complain_assignable_roles
				if(apiErrors.complain_escalation_roles) formattedErrors.complainEscalationRoles = apiErrors.complain_escalation_roles
				setErrors(formattedErrors)
				const errorTab = findTabWithErrors(formattedErrors)
				if(errorTab) setActiveSubTab(errorTab)
				toast.error("Please fix the errors in the form.")
			}else{
				setErrors({ server: "Failed to save settings. Please try again." })
				toast.error("Please try again later.")
			}
		}finally{
			setIsLoading(false)
		}
	}
	
	if(!formData){
		return null
	}

	const renderSettingsForm = (tabName) => (
		<div>
		<div className="mb-6 border-gray-200 w-full overflow-x-auto overflow-y-hidden">
			<nav className="flex -mb-px justify-start space-x-8 border-b border-gray-200">
			<button
				className={`py-4 px-1 text-sm font-medium flex items-center transition-all duration-200 ${
				activeSubTab === "website"
					? `border-b-2 text-[${theme.primaryGradientStart}] border-[${theme.primaryGradientStart}]`
					: "text-gray-500 hover:text-gray-700 hover:border-gray-300"
				}`}
				onClick={() => setActiveSubTab("website")}
			>
				<Monitor className="w-5 h-5 mr-2" />
				Website
			</button>
			<button
				className={`py-4 px-1 text-sm font-medium flex items-center transition-all duration-200 ${
				activeSubTab === "onboard"
					? `border-b-2 text-[${theme.primaryGradientStart}] border-[${theme.primaryGradientStart}]`
					: "text-gray-500 hover:text-gray-700 hover:border-gray-300"
				}`}
				onClick={() => setActiveSubTab("onboard")}
			>
				<Layers className="w-5 h-5 mr-2" />
				Onboard
			</button>
			<button
				className={`py-4 px-1 text-sm font-medium flex items-center transition-all duration-200 ${
				activeSubTab === "colors"
					? `border-b-2 text-[${theme.primaryGradientStart}] border-[${theme.primaryGradientStart}]`
					: "text-gray-500 hover:text-gray-700 hover:border-gray-300"
				}`}
				onClick={() => setActiveSubTab("colors")}
			>
				<Palette className="w-5 h-5 mr-2" />
				Colors
			</button>
			<button
				className={`py-4 px-1 text-sm font-medium flex items-center transition-all duration-200 ${
				activeSubTab === "privacy"
					? `border-b-2 text-[${theme.primaryGradientStart}] border-[${theme.primaryGradientStart}]`
					: "text-gray-500 hover:text-gray-700 hover:border-gray-300"
				}`}
				onClick={() => setActiveSubTab("privacy")}
			>
				<Shield className="w-5 h-5 mr-2" />
				Privacy Policy
			</button>
			<button
				className={`py-4 px-1 text-sm font-medium flex items-center transition-all duration-200 ${
				activeSubTab === "consent"
					? `border-b-2 text-[${theme.primaryGradientStart}] border-[${theme.primaryGradientStart}]`
					: "text-gray-500 hover:text-gray-700 hover:border-gray-300"
				}`}
				onClick={() => setActiveSubTab("consent")}
			>
				<BookX className="w-5 h-5 mr-2" />
				Consent Form
			</button>
			{activeMainTab === "driver" && (
				<button
					className={`py-4 px-1 text-sm font-medium flex items-center transition-all duration-200 ${
					activeSubTab === "fare-charges"
						? `border-b-2 text-[${theme.primaryGradientStart}] border-[${theme.primaryGradientStart}]`
						: "text-gray-500 hover:text-gray-700 hover:border-gray-300"
					}`}
					onClick={() => setActiveSubTab("fare-charges")}
				>
					<Info className="w-5 h-5 mr-2" />
					Fare & Charges Policy
				</button>
			)}
			</nav>
		</div>
		<form
			onSubmit={handleSubmit}
			className="bg-white p-6 rounded-lg shadow-md space-y-6"
		>
			{activeSubTab === "website" && (
				<div className="space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
					<ThemeUI.FormField
						label={`${tabName} Company Name`}
						name="companyName"
						error={errors.companyName}
						required={true}
					>
						<ThemeUI.Input
						id="companyName"
						name="companyName"
						value={formData.companyName}
						onChange={handleInputChange}
						placeholder="i.e. TCab"
						error={errors.companyName}
						/>
					</ThemeUI.FormField>
					<ThemeUI.FormField
						label={`${tabName} Company Email`}
						name="companyEmail"
						error={errors.companyEmail}
						required={true}
					>
						<ThemeUI.Input
						id="companyEmail"
						name="companyEmail"
						type="email"
						value={formData.companyEmail}
						onChange={handleInputChange}
						placeholder="i.e. contact@Tcab.com"
						error={errors.companyEmail}
						/>
					</ThemeUI.FormField>
					<ThemeUI.FormField
						label={`${tabName} Company Phone`}
						name="companyPhone"
						error={errors.companyPhone}
						required={true}
					>
						<ThemeUI.Input
						id="companyPhone"
						name="companyPhone"
						type="tel"
						value={formData.companyPhone}
						onChange={handleInputChange}
						placeholder="i.e. +1 (555) 123-4567"
						error={errors.companyPhone}
						/>
					</ThemeUI.FormField>
					<ThemeUI.FormField
						label={`${tabName} Company Logo`}
						name="logo"
						error={errors.logo}
					>
						<ThemeUI.FileInput
						id="logo"
						name="logo"
						onChange={handleFileChange}
						accept="image/png,image/jpeg,image/jpg"
						preview={logoPreview}
						onDelete={() => handleDeleteImage("logo")}
						error={errors.logo}
						showDeleteIcon={false}
						/>
					</ThemeUI.FormField>
					</div>
					<div className="max-sm:w-full max-lg:w-2/3 w-1/3">
					<ThemeUI.FormField
						label={`${tabName} Company Address`}
						name="companyAddress"
						error={errors.companyAddress}
					>
						<ThemeUI.Textarea
						id="companyAddress"
						name="companyAddress"
						rows="2"
						value={formData.companyAddress}
						onChange={handleInputChange}
						placeholder="i.e. 123 Business St, City, State 12345"
						error={errors.companyAddress}
						/>
					</ThemeUI.FormField>
					</div>
				</div>
			)}
			{activeSubTab === "onboard" && (
				<div className="space-y-6">
					<div className="border-b border-gray-200 pb-6 mb-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="flex flex-col space-y-4">
						<ThemeUI.FormField
							label="Onboard Image One"
							name="onboardImgOne"
							error={errors.onboardImgOne}
						>
							<ThemeUI.FileInput
							id="onboardImgOne"
							name="onboardImgOne"
							onChange={handleFileChange}
							accept="image/png,image/jpeg,image/jpg"
							preview={onboardImgOnePreview}
							onDelete={() => handleDeleteImage("onboardImgOne")}
							error={errors.onboardImgOne}
							showDeleteIcon={false}
							/>
						</ThemeUI.FormField>
						<ThemeUI.FormField
							label="Title"
							name="onboardOneTitle"
							error={errors.onboardOneTitle}
						>
							<ThemeUI.Input
							id="onboardOneTitle"
							name="onboardOneTitle"
							value={formData.onboardOneTitle}
							onChange={handleInputChange}
							placeholder="Enter title for first onboard screen"
							error={errors.onboardOneTitle}
							/>
						</ThemeUI.FormField>
						</div>
						<div>
						<ThemeUI.FormField
							label="Description"
							name="onboardOneDescription"
							error={errors.onboardOneDescription}
						>
							<ThemeUI.Textarea
							id="onboardOneDescription"
							name="onboardOneDescription"
							value={formData.onboardOneDescription}
							onChange={handleInputChange}
							placeholder="Enter description for first onboard screen"
							className="h-30"
							error={errors.onboardOneDescription}
							/>
						</ThemeUI.FormField>
						</div>
					</div>
					</div>
					<div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="flex flex-col space-y-4">
						<ThemeUI.FormField
							label="Onboard Image Two"
							name="onboardImgTwo"
							error={errors.onboardImgTwo}
						>
							<ThemeUI.FileInput
							id="onboardImgTwo"
							name="onboardImgTwo"
							onChange={handleFileChange}
							accept="image/png,image/jpeg,image/jpg"
							preview={onboardImgTwoPreview}
							onDelete={() => handleDeleteImage("onboardImgTwo")}
							error={errors.onboardImgTwo}
							showDeleteIcon={false}
							/>
						</ThemeUI.FormField>
						<ThemeUI.FormField
							label="Title"
							name="onboardTwoTitle"
							error={errors.onboardTwoTitle}
						>
							<ThemeUI.Input
							id="onboardTwoTitle"
							name="onboardTwoTitle"
							value={formData.onboardTwoTitle}
							onChange={handleInputChange}
							placeholder="Enter title for second onboard screen"
							error={errors.onboardTwoTitle}
							/>
						</ThemeUI.FormField>
						</div>
						<div>
						<ThemeUI.FormField
							label="Description"
							name="onboardTwoDescription"
							error={errors.onboardTwoDescription}
						>
							<ThemeUI.Textarea
							id="onboardTwoDescription"
							name="onboardTwoDescription"
							value={formData.onboardTwoDescription}
							onChange={handleInputChange}
							placeholder="Enter description for second onboard screen"
							className="h-30"
							error={errors.onboardTwoDescription}
							/>
						</ThemeUI.FormField>
						</div>
					</div>
					</div>
				</div>
			)}
			{activeSubTab === "colors" && (
				<div className="space-y-6">
					<div className="mb-6">
					<ThemeUI.FormField
						label="Gradient Direction"
						name="gradientDirection"
						error={errors.gradientDirection}
					>
						<ThemeUI.Select
						id="gradientDirection"
						name="gradientDirection"
						value={formData.gradientDirection}
						onChange={handleSelectChange}
						options={gradientDirections}
						placeholder="Select direction"
						error={errors.gradientDirection}
						/>
					</ThemeUI.FormField>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div className="w-full">
						<ThemeUI.FormField
						label="Primary Gradient"
						name="primaryGradient"
						error={
							errors.primaryGradientStart || errors.primaryGradientEnd
						}
						required={true}
						>
						<div className="flex flex-col space-y-3">
							<ThemeUI.ColorInput
							name="primaryGradientStart"
							value={formData.primaryGradientStart}
							onChange={handleInputChange}
							onColorPickerChange={(e) => {
								setFormData({
								...formData,
								primaryGradientStart: e.target.value,
								})
								setErrors((prev) => ({
								...prev,
								primaryGradientStart: "",
								}))
							}}
							error={errors.primaryGradientStart}
							/>
							<ThemeUI.ColorInput
							name="primaryGradientEnd"
							value={formData.primaryGradientEnd}
							onChange={handleInputChange}
							onColorPickerChange={(e) => {
								setFormData({
								...formData,
								primaryGradientEnd: e.target.value,
								})
								setErrors((prev) => ({
								...prev,
								primaryGradientEnd: "",
								}))
							}}
							error={errors.primaryGradientEnd}
							/>
							<ThemeUI.GradientPreview
							startColor={formData.primaryGradientStart}
							endColor={formData.primaryGradientEnd}
							direction={formData.gradientDirection}
							/>
						</div>
						</ThemeUI.FormField>
					</div>
					<div className="w-full">
						<ThemeUI.FormField
						label="Secondary Gradient"
						name="secondaryGradient"
						error={
							errors.secondaryGradientStart || errors.secondaryGradientEnd
						}
						required={true}
						>
						<div className="flex flex-col space-y-3">
							<ThemeUI.ColorInput
							name="secondaryGradientStart"
							value={formData.secondaryGradientStart}
							onChange={handleInputChange}
							onColorPickerChange={(e) => {
								setFormData({
								...formData,
								secondaryGradientStart: e.target.value,
								})
								setErrors((prev) => ({
								...prev,
								secondaryGradientStart: "",
								}))
							}}
							error={errors.secondaryGradientStart}
							/>
							<ThemeUI.ColorInput
							name="secondaryGradientEnd"
							value={formData.secondaryGradientEnd}
							onChange={handleInputChange}
							onColorPickerChange={(e) => {
								setFormData({
								...formData,
								secondaryGradientEnd: e.target.value,
								})
								setErrors((prev) => ({
								...prev,
								secondaryGradientEnd: "",
								}))
							}}
							error={errors.secondaryGradientEnd}
							/>
							<ThemeUI.GradientPreview
							startColor={formData.secondaryGradientStart}
							endColor={formData.secondaryGradientEnd}
							direction={formData.gradientDirection}
							/>
						</div>
						</ThemeUI.FormField>
					</div>
					</div>
				</div>
			)}
			{activeSubTab === "privacy" && (
				<div className="space-y-6">
					<ThemeUI.FormField
					label={`${
						activeMainTab.charAt(0).toUpperCase() + activeMainTab.slice(1)
					} Privacy Policy`}
					name="privacyPolicy"
					error={errors.privacyPolicy}
					required={true}
					>
					<ThemeUI.RichTextEditor
						id="privacyPolicy"
						name="privacyPolicy"
						value={formData.privacyPolicy}
						onChange={handleInputChange}
						placeholder="Enter your privacy policy content here..."
						height={400}
						error={errors.privacyPolicy}
					/>
					</ThemeUI.FormField>
				</div>
			)}
			{activeSubTab === "consent" && (
				<div className="space-y-6">
					<ThemeUI.FormField
					label={`${
						activeMainTab.charAt(0).toUpperCase() + activeMainTab.slice(1)
					} Consent Form`}
					name="consentForm"
					error={errors.consentForm}
					required={true}
					>
					<ThemeUI.RichTextEditor
						id="consentForm"
						name="consentForm"
						value={formData.consentForm}
						onChange={handleInputChange}
						placeholder="Enter your consent content here..."
						height={400}
						error={errors.consentForm}
					/>
					</ThemeUI.FormField>
				</div>
			)}
			{activeSubTab === "fare-charges" && activeMainTab === "driver" && (
				<div className="space-y-6">
					<ThemeUI.FormField
					label={`${
						activeMainTab.charAt(0).toUpperCase() + activeMainTab.slice(1)
					} Fare & Charges Policy`}
					name="fareAndChargesPolicy"
					error={errors.fareAndChargesPolicy}
					required={true}
					>
					<ThemeUI.RichTextEditor
						id="fareAndChargesPolicy"
						name="fareAndChargesPolicy"
						value={formData.fareAndChargesPolicy}
						onChange={handleInputChange}
						placeholder="Enter your fare and charges policy content here..."
						height={400}
						error={errors.fareAndChargesPolicy}
					/>
					</ThemeUI.FormField>
				</div>
			)}
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
		</div>
	)
	const renderAdminSettingsForm = () => (
		<div>
			<div className="mb-6 border-b border-gray-200">
				<nav className="flex -mb-px justify-start space-x-8">
					<button
						className={`py-4 px-1 text-sm font-medium flex items-center transition-all duration-200 ${
						activeSubTab === "website"
							? `border-b-2 text-[${theme.primaryGradientStart}] border-[${theme.primaryGradientStart}]`
							: "text-gray-500 hover:text-gray-700 hover:border-gray-300"
						}`}
						onClick={() => setActiveSubTab("website")}
					>
						<Monitor className="w-5 h-5 mr-2" />
						Website
					</button>
					<button
						className={`py-4 px-1 text-sm font-medium flex items-center transition-all duration-200 ${
						activeSubTab === "colors"
							? `border-b-2 text-[${theme.primaryGradientStart}] border-[${theme.primaryGradientStart}]`
							: "text-gray-500 hover:text-gray-700 hover:border-gray-300"
						}`}
						onClick={() => setActiveSubTab("colors")}
					>
						<Palette className="w-5 h-5 mr-2" />
						Colors
					</button>
					<button
						className={`py-4 px-1 text-sm font-medium flex items-center transition-all duration-200 ${
						activeSubTab === "configuration"
							? `border-b-2 text-[${theme.primaryGradientStart}] border-[${theme.primaryGradientStart}]`
							: "text-gray-500 hover:text-gray-700 hover:border-gray-300"
						}`}
						onClick={() => setActiveSubTab("configuration")}
					>
						<Cog className="w-5 h-5 mr-2" />
						Configuration
					</button>
					<button
						className={`py-4 px-1 text-sm font-medium flex items-center transition-all duration-200 ${
							activeSubTab === "reservation"
								? `border-b-2 text-[${theme.primaryGradientStart}] border-[${theme.primaryGradientStart}]`
								: "text-gray-500 hover:text-gray-700 hover:border-gray-300"
						}`}
						onClick={() => setActiveSubTab("reservation")}
					>
						<Info className="w-5 h-5 mr-2" />
						Reservation Policies
					</button>
				</nav>
			</div>
			<form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-6">
				{activeSubTab === "website" && (
					<div className="space-y-6">
						<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
							<ThemeUI.FormField
								label="Admin Company Name"
								name="companyName"
								error={errors.companyName}
								required={true}
							>
								<ThemeUI.Input
									id="companyName"
									name="companyName"
									value={formData.companyName}
									onChange={handleInputChange}
									placeholder="i.e. TCab"
									error={errors.companyName}
								/>
							</ThemeUI.FormField>
							<ThemeUI.FormField
								label="Admin Company Email"
								name="companyEmail"
								error={errors.companyEmail}
								required={true}
							>
								<ThemeUI.Input
									id="companyEmail"
									name="companyEmail"
									type="email"
									value={formData.companyEmail}
									onChange={handleInputChange}
									placeholder="i.e. contact@Tcab.com"
									error={errors.companyEmail}
								/>
							</ThemeUI.FormField>
							<ThemeUI.FormField
								label="Admin Company Phone"
								name="companyPhone"
								error={errors.companyPhone}
								required={true}
							>
								<ThemeUI.Input
									id="companyPhone"
									name="companyPhone"
									type="tel"
									value={formData.companyPhone}
									onChange={handleInputChange}
									placeholder="i.e. +1 (555) 123-4567"
									error={errors.companyPhone}
								/>
							</ThemeUI.FormField>
							<ThemeUI.FormField
								label="Admin Company Logo"
								name="logo"
								error={errors.logo}
							>
								<ThemeUI.FileInput
									id="logo"
									name="logo"
									onChange={handleFileChange}
									accept="image/png,image/jpeg,image/jpg"
									preview={logoPreview}
									onDelete={() => handleDeleteImage("logo")}
									error={errors.logo}
									showDeleteIcon={false}
								/>
							</ThemeUI.FormField>
						</div>
						<div className="max-sm:w-full max-lg:w-2/3 w-1/3">
							<ThemeUI.FormField
								label="Admin Company Address"
								name="companyAddress"
								error={errors.companyAddress}
							>
								<ThemeUI.Textarea
									id="companyAddress"
									name="companyAddress"
									rows="2"
									value={formData.companyAddress}
									onChange={handleInputChange}
									placeholder="i.e. 123 Business St, City, State 12345"
									error={errors.companyAddress}
								/>
							</ThemeUI.FormField>
						</div>
					</div>
				)}
				{activeSubTab === "colors" && (
					<div className="space-y-6">
						<div className="mb-6">
							<ThemeUI.FormField
								label="Gradient Direction"
								name="gradientDirection"
								error={errors.gradientDirection}
							>
								<ThemeUI.Select
								id="gradientDirection"
								name="gradientDirection"
								value={formData.gradientDirection}
								onChange={handleSelectChange}
								options={gradientDirections}
								placeholder="Select direction"
								error={errors.gradientDirection}
								/>
							</ThemeUI.FormField>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6 gradient-grid">
							<div className="w-full">
								<ThemeUI.FormField
									label="Primary Gradient"
									name="primaryGradient"
									error={
										errors.primaryGradientStart || errors.primaryGradientEnd
									}
									required={true}
								>
								<div className="flex flex-col space-y-3">
									<ThemeUI.ColorInput
										name="primaryGradientStart"
										value={formData.primaryGradientStart}
										onChange={handleInputChange}
										onColorPickerChange={(e) => {
											setFormData({
											...formData,
											primaryGradientStart: e.target.value,
											})
											setErrors((prev) => ({
											...prev,
											primaryGradientStart: "",
											}))
										}}
										error={errors.primaryGradientStart}
									/>
									<ThemeUI.ColorInput
										name="primaryGradientEnd"
										value={formData.primaryGradientEnd}
										onChange={handleInputChange}
										onColorPickerChange={(e) => {
											setFormData({
											...formData,
											primaryGradientEnd: e.target.value,
											})
											setErrors((prev) => ({
											...prev,
											primaryGradientEnd: "",
											}))
										}}
										error={errors.primaryGradientEnd}
									/>
									<ThemeUI.GradientPreview
										startColor={formData.primaryGradientStart}
										endColor={formData.primaryGradientEnd}
										direction={formData.gradientDirection}
									/>
								</div>
								</ThemeUI.FormField>
							</div>
							<div className="w-full">
								<ThemeUI.FormField
									label="Secondary Gradient"
									name="secondaryGradient"
									error={
										errors.secondaryGradientStart || errors.secondaryGradientEnd
									}
									required={true}
								>
								<div className="flex flex-col space-y-3">
									<ThemeUI.ColorInput
										name="secondaryGradientStart"
										value={formData.secondaryGradientStart}
										onChange={handleInputChange}
										onColorPickerChange={(e) => {
											setFormData({
											...formData,
											secondaryGradientStart: e.target.value,
											})
											setErrors((prev) => ({
											...prev,
											secondaryGradientStart: "",
											}))
										}}
										error={errors.secondaryGradientStart}
									/>
									<ThemeUI.ColorInput
										name="secondaryGradientEnd"
										value={formData.secondaryGradientEnd}
										onChange={handleInputChange}
										onColorPickerChange={(e) => {
											setFormData({
											...formData,
											secondaryGradientEnd: e.target.value,
											})
											setErrors((prev) => ({
											...prev,
											secondaryGradientEnd: "",
											}))
										}}
										error={errors.secondaryGradientEnd}
									/>
									<ThemeUI.GradientPreview
										startColor={formData.secondaryGradientStart}
										endColor={formData.secondaryGradientEnd}
										direction={formData.gradientDirection}
									/>
								</div>
								</ThemeUI.FormField>
							</div>
							<div className="w-full">
								<ThemeUI.FormField
									label="Sidebar Gradient"
									name="sidebarGradient"
									error={
										errors.sidebarGradientStart || errors.sidebarGradientEnd
									}
									required={true}
								>
								<div className="flex flex-col space-y-3">
									<ThemeUI.ColorInput
										name="sidebarGradientStart"
										value={formData.sidebarGradientStart}
										onChange={handleInputChange}
										onColorPickerChange={(e) => {
											setFormData({
											...formData,
											sidebarGradientStart: e.target.value,
											})
											setErrors((prev) => ({
											...prev,
											sidebarGradientStart: "",
											}))
										}}
										error={errors.sidebarGradientStart}
									/>
									<ThemeUI.ColorInput
										name="sidebarGradientEnd"
										value={formData.sidebarGradientEnd}
										onChange={handleInputChange}
										onColorPickerChange={(e) => {
											setFormData({
											...formData,
											sidebarGradientEnd: e.target.value,
											})
											setErrors((prev) => ({
											...prev,
											sidebarGradientEnd: "",
											}))
										}}
										error={errors.sidebarGradientEnd}
									/>
									<ThemeUI.GradientPreview
										startColor={formData.sidebarGradientStart}
										endColor={formData.sidebarGradientEnd}
										direction={formData.gradientDirection}
									/>
								</div>
								</ThemeUI.FormField>
							</div>
						</div>
					</div>
				)}
				{activeSubTab === "configuration" && (
					<div className="space-y-6">
						<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
							<ThemeUI.FormField
								label="Commission Type"
								name="commissionType"
								error={errors.commissionType}
								required={true}
							>
								<ThemeUI.Select
									id="commissionType"
									name="commissionType"
									value={formData.commissionType}
									onChange={handleSelectChange}
									options={[
										{ value: "percentage", label: "Percentage" },
										{ value: "fixed", label: "Fixed Amount" },
									]}
									placeholder="Select commission type"
									error={errors.commissionType}
									isSearchable={false}
								/>
								<p className="text-xs text-gray-500 mt-1">
									Choose how commission is calculated.
								</p>
							</ThemeUI.FormField>
							<ThemeUI.FormField
								label			= "Book Any Vehicle"
								name			= "bookAnyVehicle"
								error			= {errors.bookAnyVehicle}
								required		= {true}
							>
								<ThemeUI.Select
									id			= "bookAnyVehicle"
									name		= "bookAnyVehicle"
									value		= {formData.bookAnyVehicle}
									onChange	= {handleSelectChange}
									options		= {[
										{ value: "show", label: "Show" },
										{ value: "hide", label: "Hide" },
									]}
									placeholder = "Select"
									error		= {errors.bookAnyVehicle}
									isSearchable= {false}
								/>
								<p className="text-xs text-gray-500 mt-1">
									Allow riders to book any vehicle or limit to specific types.
								</p>
							</ThemeUI.FormField>
							<ThemeUI.FormField
								label			= "Max Cancellations Per Day"
								name			= "maxCancellationsPerDay"
								error			= {errors.maxCancellationsPerDay}
								required		= {true}
							>
								<ThemeUI.Input
									id          = "maxCancellationsPerDay"
									name        = "maxCancellationsPerDay"
									type        = "number"
									step        = "1"
									min         = "0"
									max         = "50"
									value       = {formData.maxCancellationsPerDay}
									onChange    = {handleInputChange}
									placeholder = "Enter max cancellations (e.g., 3)"
									error       = {errors.maxCancellationsPerDay}
								/>
								<p className="text-xs text-gray-500 mt-1">
									Number of free cancellations allowed per driver per day.
								</p>
							</ThemeUI.FormField>
							<ThemeUI.FormField
								label			= "Max Cancellations Amount"
								name			= "maxCancellationAmt"
								error			= {errors.maxCancellationAmt}
								required		= {true}
							>
								<ThemeUI.Input
									id          = "maxCancellationAmt"
									name        = "maxCancellationAmt"
									type        = "number"
									step        = "1"
									min         = "0"
									value       = {formData.maxCancellationAmt}
									onChange    = {handleInputChange}
									placeholder = "Enter max cancellations Amount (e.g., 3000)"
									error       = {errors.maxCancellationAmt}
								/>
								<p className="text-xs text-gray-500 mt-1">
									This is the maximum cancellation charge allowed.
								</p>
							</ThemeUI.FormField>
							<ThemeUI.FormField
								label			= "Cancellation Charge (%)"
								name			= "cancellationChargePercent"
								error			= {errors.cancellationChargePercent}
								required		= {true}
							>
								<ThemeUI.Input
									id          = "cancellationChargePercent"
									name        = "cancellationChargePercent"
									type        = "number"
									step        = "0.01"
									min         = "0"
									max         = "100"
									value       = {formData.cancellationChargePercent}
									onChange    = {handleInputChange}
									placeholder = "Enter charge percentage (e.g., 10)"
									error       = {errors.cancellationChargePercent}
								/>
								<p className="text-xs text-gray-500 mt-1">
									Percentage of ride amount deducted from deposit after exceeding limit.
								</p>
							</ThemeUI.FormField>
							<ThemeUI.FormField
								label			= "Max Negative Wallet Balance"
								name			= "walletNegativeLimit"
								error			= {errors.walletNegativeLimit}
								required		= {true}
							>
								<ThemeUI.Input
									id          = "walletNegativeLimit"
									name        = "walletNegativeLimit"
									type        = "number"
									step        = "1"
									min         = "0"
									value       = {formData.walletNegativeLimit}
									onChange    = {handleInputChange}
									placeholder = "Enter max negative amount (e.g., 500)"
									error       = {errors.walletNegativeLimit}
								/>
								<p className="text-xs text-gray-500 mt-1">
									Maximum amount the wallet can go negative (e.g., 500 allows balance down to -500).
								</p>
							</ThemeUI.FormField>
							<ThemeUI.FormField
								label			= "Transfer Time From"
								name			= "transferTimeFrom"
								error			= {errors.transferTimeFrom}
								required		= {true}
							>
								<ThemeUI.Input
									id          = "transferTimeFrom"
									name        = "transferTimeFrom"
									type        = "time"
									value       = {formData.transferTimeFrom}
									onChange    = {handleInputChange}
									placeholder = "e.g., 09:00"
									error       = {errors.transferTimeFrom}
								/>
								<p className="text-xs text-gray-500 mt-1">
									Start time for allowed transfers.
								</p>
							</ThemeUI.FormField>
							<ThemeUI.FormField
								label			= "Transfer Time To"
								name			= "transferTimeTo"
								error			= {errors.transferTimeTo}
								required		= {true}
							>
								<ThemeUI.Input
									id          = "transferTimeTo"
									name        = "transferTimeTo"
									type        = "time"
									value       = {formData.transferTimeTo}
									onChange    = {handleInputChange}
									placeholder = "e.g., 18:00"
									error       = {errors.transferTimeTo}
								/>
								<p className="text-xs text-gray-500 mt-1">
									End time for allowed transfers.
								</p>
							</ThemeUI.FormField>
							<ThemeUI.FormField
								label="Complaint Assignable Roles"
								name="complainAssignableRoles"
								error={errors.complainAssignableRoles}
								required={true}
							>
								<ThemeUI.Select
									id          = "complainAssignableRoles"
									name        = "complainAssignableRoles"
									isMulti
									value       = { formData.complainAssignableRoles ?.split(",").filter((id) => id) || [] }
									onChange    = {(selectedValues) => {
										const selectedIds = selectedValues.join(",") || ""
										setFormData((prev) => ({
											...prev,
											complainAssignableRoles: selectedIds,
										}))
										if(errors.complainAssignableRoles){
											setErrors((prev) => ({
												...prev,
												complainAssignableRoles: ""
											}))
										}
									}}
									options     = {roles.map((role) => ({
										value: role.id.toString(),
										label: role.name,
									}))}
									placeholder = "Select roles"
									error       = {errors.complainAssignableRoles}
								/>
								<p className="text-xs text-gray-500 mt-1">
									Select which roles can be assigned to handle complaints.
								</p>
							</ThemeUI.FormField>
							<ThemeUI.FormField
								label="Complaint Escalation Roles (24hr+)"
								name="complainEscalationRoles"
								error={errors.complainEscalationRoles}
								required={true}
							>
								<ThemeUI.Select
									id="complainEscalationRoles"
									name="complainEscalationRoles"
									isMulti
									value       = { formData.complainEscalationRoles ?.split(",").filter((id) => id) || [] }
									onChange    = {(selectedValues) => {
										const selectedIds = selectedValues.join(",") || ""
										setFormData((prev) => ({
											...prev,
											complainEscalationRoles: selectedIds,
										}))
										if(errors.complainEscalationRoles){
											setErrors((prev) => ({
												...prev,
												complainEscalationRoles: ""
											}))
										}
									}}
									options={roles.map(role => ({
										value: role.id.toString(),
										label: role.name,
									}))}
									placeholder="Select roles"
									error={errors.complainEscalationRoles}
								/>
								<p className="text-xs text-gray-500 mt-1">
									These roles will be notified by email if a complaint remains in "Open" status for more than 24 hours.
									The ticket status will automatically change to "Escalated".
								</p>
							</ThemeUI.FormField>
						</div>
					</div>
				)}
				{activeSubTab === "reservation" && (
					<div className="space-y-6">
						<ThemeUI.FormField
							label="Reservation Policies"
							name="reservationPolicy"
							error={errors.reservationPolicy}
							required={true}
						>
							<ThemeUI.RichTextEditor
								id="reservationPolicy"
								name="reservationPolicy"
								value={formData.reservationPolicy}
								onChange={handleInputChange}
								placeholder="Enter your reservation policy content here..."
								height={400}
								error={errors.reservationPolicy}
							/>
						</ThemeUI.FormField>
					</div>
				)}
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
		</div>
	)
	return (
		<Layout>
		<div className="flex flex-row justify-between items-center mb-6">
			<h1 className="text-2xl font-bold">Settings</h1>
			<nav className="flex items-center text-sm text-gray-500 whitespace-nowrap overflow-x-auto">
			<ol className="flex items-center">
				<li>
				<a
					href="/dashboard"
					className="hover:text-blue-600 transition-colors"
				>
					Home
				</a>
				</li>
				<li className="flex items-center">
				<ChevronRight className="h-4 w-4 mx-1" />
				</li>
				<li
				style={{ color: theme.primaryGradientStart }}
				className="font-medium"
				>
				Settings
				</li>
			</ol>
			</nav>
		</div>
		<div className="flex justify-center mb-4">
			<div className="inline-flex rounded-md shadow-sm" role="group">
			{[
				{ id: "user", label: "User", icon: User, isFirst: true },
				{ id: "driver", label: "Driver", icon: Truck },
				{ id: "admin", label: "Admin", icon: Shield, isLast: true },
			].map(({ id, label, icon: Icon, isFirst, isLast }) => (
				<button
				key={id}
				type="button"
				className={`px-6 py-3 text-sm font-medium flex items-center transition-all duration-200 ${
					isFirst ? "rounded-l-md" : isLast ? "rounded-r-md" : "border-r"
				} ${
					activeMainTab === id
					? "text-white border-transparent"
					: "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
				}`}
				style={
					activeMainTab === id
					? {
						background: `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})`,
						}
					: {}
				}
				onClick={() => handleMainTabChange(id)}
				>
				<Icon className="w-5 h-5 mr-2" />
				{label}
				</button>
			))}
			</div>
		</div>
		{activeMainTab === "user" && renderSettingsForm("User")}
		{activeMainTab === "driver" && renderSettingsForm("Driver")}
		{activeMainTab === "admin" && renderAdminSettingsForm()}
		</Layout>
	)
}
export default Settings