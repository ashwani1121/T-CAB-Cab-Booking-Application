import React, { useState, useEffect } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import Layout from "./Layout"
import { useTheme } from "../context/themeContext"
import { ThemeUI } from "../context/themeUI"
import {
  ChevronRight,
  Loader,
  Map,
  Edit,
  Save,
  Plane,
  Info,
  Car,
} from "lucide-react"
import { format } from "date-fns"

function Trips() {
  const { theme } = useTheme()
  const [activeTab, setActiveTab] = useState("manageTrips")
  const [trips, setTrips] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [editingTrip, setEditingTrip] = useState(null)
  const [formData, setFormData] = useState({
    tripName: "",
    tripImage: null,
  })
  const [imagePreview, setImagePreview] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [backendErrors, setBackendErrors] = useState({})
  const [promotionData, setPromotionData] = useState({
    hero: {
      title: "",
      image: null,
      isTextEnabled: true,
    },
    ads: [
      {
        images: [],
        buttonText: "",
        link: "",
        imageTitle: "",
        isImageTitleEnabled: true,
        isButtonEnabled: true,
      },
      {
        images: [],
        buttonText: "",
        link: "",
        imageTitle: "",
        isImageTitleEnabled: true,
        isButtonEnabled: true,
      },
    ],
  })
  const [heroImagePreview, setHeroImagePreview] = useState(null)
  const [adImagePreviews, setAdImagePreviews] = useState([[], []])
  const [heroImageRemoved, setHeroImageRemoved] = useState(false)

  // Fetch trip and promotion data on mount
  useEffect(() => {
    const fetchTrips = async () => {
      setIsLoading(true)
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/admin/trips`
        )
        setTrips(response.data.data || [])
      } catch (err) {
        toast.error("Failed to load trips.")
        console.error("Fetch trips error:", err)
      } finally {
        setIsLoading(false)
      }
    }

    const fetchPromotions = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/admin/trips/promotions`
        )
        if (response.data.success && response.data.data) {
          const fetchedAds = response.data.data.ads.map((ad, adIndex) => ({
            images: Array.isArray(ad.images)
              ? ad.images.map((url, idx) => ({
                  name: url.split("/").pop(),
                  preview: url,
                  size: Number(ad.metadata?.[idx]?.size) || 0, // Ensure size is a number
                  type: "image/jpeg",
                }))
              : [],
            buttonText: ad.buttonText || "",
            link: ad.link || "",
            imageTitle: ad.imageTitle || "",
            isImageTitleEnabled: ad.isImageTitleEnabled ?? true,
            isButtonEnabled: ad.isButtonEnabled ?? true,
          }))
          setPromotionData({
            hero: {
              title: response.data.data.hero.title || "",
              image: null,
              isTextEnabled: response.data.data.hero.isTextEnabled ?? true,
            },
            ads: fetchedAds,
          })
          setHeroImagePreview(response.data.data.hero.image || null)
          setAdImagePreviews(
            fetchedAds.map((ad) => ad.images.map((img) => img.preview))
          )
        }
      } catch (err) {
        toast.error("Failed to load promotion data.")
        console.error("Fetch promotions error:", err)
      }
    }

    fetchTrips()
    fetchPromotions()
  }, [])

  // Cleanup image previews on unmount
  useEffect(() => {
    return () => {
      adImagePreviews.forEach((previews) =>
        previews.forEach((preview) => {
          if (preview?.startsWith("blob:")) {
            URL.revokeObjectURL(preview)
          }
        })
      )
      if (heroImagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(heroImagePreview)
      }
      if (imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [adImagePreviews, heroImagePreview, imagePreview])

  // Tab switching handler
  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setBackendErrors({})
  }

  // Handle input changes for trip form
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (backendErrors[name]) {
      setBackendErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  // Handle trip image change
  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFormData((prev) => ({
        ...prev,
        tripImage: file,
      }))
      setImagePreview(URL.createObjectURL(file))
      if (backendErrors.tripImage) {
        setBackendErrors((prev) => ({ ...prev, tripImage: "" }))
      }
    }
  }

  // Start editing a trip
  const handleEditClick = (trip) => {
    setBackendErrors({})
    setEditingTrip(trip)
    setFormData({
      tripName: trip.trip,
      tripImage: null,
    })
    setImagePreview(trip.image)
  }

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingTrip(null)
    setFormData({
      tripName: "",
      tripImage: null,
    })
    setImagePreview(null)
    setBackendErrors({})
  }

  // Save trip changes
  const handleSaveTrip = async () => {
    setIsSubmitting(true)
    try {
      const form = new FormData()
      form.append("trip", formData.tripName)
      if (formData.tripImage) {
        form.append("image", formData.tripImage)
      }
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/admin/trips/${editingTrip.id}`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
      )
      if (response.data.success) {
        toast.success("Trip updated successfully")
        setTrips((prevTrips) => {
          const updatedTrips = [...prevTrips]
          const index = updatedTrips.findIndex((t) => t.id === editingTrip.id)
          if (index !== -1) {
            updatedTrips[index] = response.data.data
          }
          return updatedTrips
        })
        handleCancelEdit()
      }
    } catch (err) {
      if (err.response && err.response.data.errors) {
        const apiErrors = err.response.data.errors
        setBackendErrors({
          tripName: apiErrors.trip || "",
          tripImage: apiErrors.image || "",
          server: apiErrors.server || "",
        })
        toast.error("Please fix the errors in the form.")
      } else {
        toast.error("Failed to update trip. Please try again.")
        console.error("Save trip error:", err)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle promotion input changes
  const handlePromotionInputChange = (section, index, field, value) => {
    setPromotionData((prev) => {
      if (section === "hero") {
        return {
          ...prev,
          hero: { ...prev.hero, [field]: value },
        }
      } else {
        const updatedAds = [...prev.ads]
        updatedAds[index] = { ...updatedAds[index], [field]: value }
        return { ...prev, ads: updatedAds }
      }
    })
    if (section === "hero" && backendErrors[field]) {
      setBackendErrors((prev) => ({ ...prev, [field]: "" }))
    } else if (section === "ads" && backendErrors[`ad_${index}_${field}`]) {
      setBackendErrors((prev) => ({ ...prev, [`ad_${index}_${field}`]: "" }))
    }
  }

  const handleHeroImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPromotionData((prev) => ({
        ...prev,
        hero: { ...prev.hero, image: file },
      }))
      setHeroImagePreview(URL.createObjectURL(file))
      setHeroImageRemoved(false)
      if (backendErrors.hero_image) {
        setBackendErrors((prev) => ({ ...prev, hero_image: "" }))
      }
    }
  }

  // Handle hero image deletion
  const handleHeroImageDelete = () => {
    setPromotionData((prev) => ({
      ...prev,
      hero: { ...prev.hero, image: null },
    }))
    setHeroImagePreview(null)
    setHeroImageRemoved(true) // Set removal flag
    document.getElementById("heroImage").value = ""
    if (backendErrors.hero_image) {
      setBackendErrors((prev) => ({ ...prev, hero_image: "" }))
    }
  }

  const handleAdImagesChange = (e, adIndex) => {
    const files = Array.from(e.target.files || []).filter(
      (file) => file instanceof File
    )
    if (files.length > 0) {
      setPromotionData((prev) => {
        const currentImages = prev.ads[adIndex].images || []
        const availableSlots = 5 - currentImages.length

        if (files.length > availableSlots) {
          toast.warning(`You can only upload ${availableSlots} more image(s).`)
        }

        const newFiles = files.slice(0, availableSlots).map((file) => ({
          name: file.name,
          preview: URL.createObjectURL(file),
          size: file.size, // Always include size for new files
          type: file.type,
          file,
        }))
        const combinedImages = [...currentImages, ...newFiles]
        const updatedAds = [...prev.ads]
        updatedAds[adIndex] = { ...updatedAds[adIndex], images: combinedImages }

        return { ...prev, ads: updatedAds }
      })

      setAdImagePreviews((prev) => {
        const currentPreviews = prev[adIndex] || []
        const availableSlots = 5 - currentPreviews.length
        const newPreviews = files
          .slice(0, availableSlots)
          .map((file) => URL.createObjectURL(file))
        const combinedPreviews = [...currentPreviews, ...newPreviews]

        const updatedPreviews = [...prev]
        updatedPreviews[adIndex] = combinedPreviews
        return updatedPreviews
      })

      if (backendErrors[`ad_${adIndex}_images`]) {
        setBackendErrors((prev) => ({ ...prev, [`ad_${adIndex}_images`]: "" }))
      }

      e.target.value = "" // Reset file input
    }
  }

  const handleAdImageDelete = (adIndex, fileIndex) => {
    setPromotionData((prev) => {
      const updatedAds = [...prev.ads]
      const updatedImages = [...updatedAds[adIndex].images]
      updatedImages.splice(fileIndex, 1)
      updatedAds[adIndex] = { ...updatedAds[adIndex], images: updatedImages }
      return { ...prev, ads: updatedAds }
    })
    setAdImagePreviews((prev) => {
      const updatedPreviews = [...prev]
      const updatedAdPreviews = [...updatedPreviews[adIndex]]
      const removedPreview = updatedAdPreviews.splice(fileIndex, 1)[0]
      if (removedPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(removedPreview)
      }
      updatedPreviews[adIndex] = updatedAdPreviews
      return updatedPreviews
    })
    if (backendErrors[`ad_${adIndex}_images`]) {
      setBackendErrors((prev) => ({ ...prev, [`ad_${adIndex}_images`]: "" }))
    }
  }

  const handleCheckboxChange = (section, index, field) => {
    setPromotionData((prev) => {
      if (section === "hero") {
        return {
          ...prev,
          hero: { ...prev.hero, [field]: !prev.hero[field] },
        }
      } else {
        const updatedAds = [...prev.ads]
        updatedAds[index] = {
          ...updatedAds[index],
          [field]: !updatedAds[index][field],
        }
        return { ...prev, ads: updatedAds }
      }
    })
    if (section === "ads" && field === "isButtonEnabled") {
      setBackendErrors((prev) => ({
        ...prev,
        [`ad_${index}_buttonText`]: "",
        [`ad_${index}_link`]: "",
      }))
    }
  }

  const handlePromotionSubmit = async () => {
    setIsSubmitting(true)
    try {
      const form = new FormData()
      form.append("heroTitle", promotionData.hero.title)
      form.append("heroIsTextEnabled", promotionData.hero.isTextEnabled)
      form.append("heroImageRemoved", heroImageRemoved)
      if (promotionData.hero.image instanceof File) {
        form.append("heroImage", promotionData.hero.image)
      }
      promotionData.ads.forEach((ad, index) => {
        ad.images.forEach((image) => {
          if (image.file instanceof File) {
            form.append(`ad_${index}_images`, image.file)
          }
        })
        const existingImages = ad.images
          .filter((image) => !image.file && image.preview)
          .map((image) => ({
            name: image.name,
            url: image.preview,
            size: Number(image.size) || 0, // Ensure size is a number
          }))
        if (existingImages.length > 0) {
          form.append(
            `ad_${index}_existingImages`,
            JSON.stringify(existingImages)
          )
        }
        form.append(`ad_${index}_buttonText`, ad.buttonText)
        form.append(`ad_${index}_link`, ad.link)
        form.append(`ad_${index}_imageTitle`, ad.imageTitle)
        form.append(`ad_${index}_isImageTitleEnabled`, ad.isImageTitleEnabled)
        form.append(`ad_${index}_isButtonEnabled`, ad.isButtonEnabled)
      })
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/admin/trips/promotions`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } }
      )
      if (response.data.success && response.data.data) {
        toast.success("Promotion updated successfully")
        const fetchedAds =
          response.data.data.ad1 && response.data.data.ad2
            ? [
                {
                  images: Array.isArray(response.data.data.ad1.images)
                    ? response.data.data.ad1.images.map((url, idx) => ({
                        name: url.split("/").pop(),
                        preview: url,
                        size:
                          Number(
                            response.data.data.ad1.metadata?.[idx]?.size
                          ) || 0,
                        type: "image/jpeg",
                      }))
                    : [],
                  buttonText: response.data.data.ad1.button_text || "",
                  link: response.data.data.ad1.link || "",
                  imageTitle: response.data.data.ad1.image_title || "",
                  isImageTitleEnabled:
                    response.data.data.ad1.is_image_title_enabled ?? true,
                  isButtonEnabled:
                    response.data.data.ad1.is_button_enabled ?? true,
                },
                {
                  images: Array.isArray(response.data.data.ad2.images)
                    ? response.data.data.ad2.images.map((url, idx) => ({
                        name: url.split("/").pop(),
                        preview: url,
                        size:
                          Number(
                            response.data.data.ad2.metadata?.[idx]?.size
                          ) || 0,
                        type: "image/jpeg",
                      }))
                    : [],
                  buttonText: response.data.data.ad2.button_text || "",
                  link: response.data.data.ad2.link || "",
                  imageTitle: response.data.data.ad2.image_title || "",
                  isImageTitleEnabled:
                    response.data.data.ad2.is_image_title_enabled ?? true,
                  isButtonEnabled:
                    response.data.data.ad2.is_button_enabled ?? true,
                },
              ]
            : [
                {
                  images: [],
                  buttonText: "",
                  link: "",
                  imageTitle: "",
                  isImageTitleEnabled: true,
                  isButtonEnabled: true,
                },
                {
                  images: [],
                  buttonText: "",
                  link: "",
                  imageTitle: "",
                  isImageTitleEnabled: true,
                  isButtonEnabled: true,
                },
              ]
        setPromotionData({
          hero: {
            title: response.data.data.hero_title || "",
            image: null,
            isTextEnabled: response.data.data.hero_is_text_enabled ?? true,
          },
          ads: fetchedAds,
        })
        setHeroImagePreview(response.data.data.hero_image || null)
        setHeroImageRemoved(false)
        setAdImagePreviews(
          fetchedAds.map((ad) => ad.images.map((img) => img.preview))
        )
        setBackendErrors({})
      }
    } catch (err) {
      console.error("Promotion submit error:", err)
      if (err.response && err.response.data.errors) {
        const apiErrors = err.response.data.errors
        setBackendErrors({
          hero_title: apiErrors.hero_title || "",
          hero_image: apiErrors.hero_image || "",
          ad_0_imageTitle: apiErrors.ad_0_imageTitle || "",
          ad_0_images: apiErrors.ad_0_images || "",
          ad_0_buttonText: apiErrors.ad_0_buttonText || "",
          ad_0_link: apiErrors.ad_0_link || "",
          ad_1_imageTitle: apiErrors.ad_1_imageTitle || "",
          ad_1_images: apiErrors.ad_1_images || "",
          ad_1_buttonText: apiErrors.ad_1_buttonText || "",
          ad_1_link: apiErrors.ad_1_link || "",
          server: apiErrors.server || "",
        })
        toast.error("Please fix the errors in the form.")
      } else {
        toast.error("Failed to update promotion. Please try again.")
        setBackendErrors({
          server: "Failed to update promotion. Please try again.",
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Render trip cards
  const renderTripCards = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-40">
          <Loader
            className="animate-spin"
            size={32}
            style={{ color: theme.primaryGradientStart }}
          />
        </div>
      )
    }
    if (!trips || trips.length === 0) {
      return (
        <div className="text-center py-10 text-gray-500">
          No trip types found.
        </div>
      )
    }
    const getGradientStyle = () => ({
      background: `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})`,
    })
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trips.map((trip) => (
          <div
            key={trip.id}
            className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200"
          >
            {editingTrip && editingTrip.id === trip.id ? (
              <div className="p-3 space-y-3">
                <ThemeUI.FormField
                  label="Trip Name"
                  name="tripName"
                  error={backendErrors.tripName}
                >
                  <ThemeUI.Input
                    id="tripName"
                    name="tripName"
                    value={formData.tripName}
                    onChange={handleInputChange}
                    placeholder="Enter trip name"
                    error={backendErrors.tripName}
                  />
                </ThemeUI.FormField>
                <ThemeUI.FormField
                  label="Trip Image"
                  name="tripImage"
                  error={backendErrors.tripImage}
                >
                  <div>
                    <ThemeUI.FileInput
                      id="tripImage"
                      name="tripImage"
                      onChange={handleImageChange}
                      accept="image/png,image/jpeg,image/jpg"
                      preview={imagePreview}
                      onDelete={() => {
                        setFormData((prev) => ({ ...prev, tripImage: null }))
                        setImagePreview(null)
                        document.getElementById("tripImage").value = ""
                        if (backendErrors.tripImage) {
                          setBackendErrors((prev) => ({
                            ...prev,
                            tripImage: "",
                          }))
                        }
                      }}
                      error={backendErrors.tripImage}
                      showDeleteIcon={true}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Note: For optimal display, upload an image with 16:9
                      aspect ratio (recommended dimensions: 800x450px)
                    </p>
                  </div>
                </ThemeUI.FormField>
                <div className="flex justify-end space-x-2 mt-2">
                  <ThemeUI.Button
                    type="button"
                    onClick={handleCancelEdit}
                    gradientColors={{
                      start: "#6B7280",
                      end: "#4B5563",
                    }}
                    direction={theme.gradientDirection}
                  >
                    Cancel
                  </ThemeUI.Button>
                  <ThemeUI.Button
                    type="button"
                    onClick={handleSaveTrip}
                    loading={isSubmitting}
                    gradientColors={{
                      start: theme.primaryGradientStart,
                      end: theme.primaryGradientEnd,
                    }}
                    direction={theme.gradientDirection}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center space-x-2">
                        <Loader className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                        <span>Saving...</span>
                      </div>
                    ) : (
                      <>
                        <Save size={16} className="mr-2" />
                        Save Changes
                      </>
                    )}
                  </ThemeUI.Button>
                </div>
              </div>
            ) : (
              <>
                <div
                  className="h-40 w-full relative overflow-hidden"
                  style={getGradientStyle()}
                >
                  {trip.image ? (
                    <img
                      src={trip.image}
                      alt={trip.trip}
                      className="w-full h-full object-contain object-center"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full w-full">
                      <Car size={40} className="text-white opacity-80" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <div className="flex justify-between items-start">
                    <h3
                      className="text-lg font-semibold"
                      style={{ color: theme.primaryGradientStart }}
                    >
                      {trip.trip}
                    </h3>
                    <button
                      onClick={() => handleEditClick(trip)}
                      className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                      aria-label="Edit trip"
                    >
                      <Edit
                        size={16}
                        style={{ color: theme.primaryGradientStart }}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Last Updated:{" "}
                    {format(new Date(trip.updatedAt), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    )
  }

  const renderPromotionContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-40">
          <Loader
            className="animate-spin"
            size={32}
            style={{ color: theme.primaryGradientStart }}
          />
        </div>
      )
    }
    return (
      <div className="space-y-8">
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="p-6">
            {/* Banner Section */}
            <div className="mb-10">
              <div className="flex items-center mb-4">
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center mr-3"
                  style={{
                    background: `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})`,
                  }}
                >
                  <span className="text-white font-medium">1</span>
                </div>
                <h3 className="text-lg font-medium">Banner Configuration</h3>
              </div>
              <div className="flex flex-row items-center gap-8 rounded-lg p-6 border border-gray-200">
                {/* Banner Image Upload */}
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-1">
                      <label
                        htmlFor="heroImage"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Banner Image
                      </label>
                      <span className="text-red-500">*</span>
                    </div>
                    <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      (recommended: 1200×675px (16:9))
                    </span>
                  </div>
                  <ThemeUI.FileInput
                    id="heroImage"
                    name="heroImage"
                    onChange={handleHeroImageChange}
                    accept="image/png,image/jpeg,image/jpg"
                    preview={heroImagePreview}
                    onDelete={handleHeroImageDelete}
                    error={backendErrors.hero_image}
                    showDeleteIcon={false}
                  />
                </div>

                {/* Banner Title */}
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <label
                      htmlFor="heroTitle"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Banner Title
                    </label>
                    <div className="flex items-center gap-2">
                      <ThemeUI.Checkbox
                        id="heroTextEnabled"
                        name="heroTextEnabled"
                        checked={promotionData.hero.isTextEnabled}
                        onChange={() =>
                          handleCheckboxChange("hero", null, "isTextEnabled")
                        }
                      />
                      <label
                        htmlFor="heroTextEnabled"
                        className="text-sm text-gray-700"
                      >
                        Enable
                      </label>
                    </div>
                  </div>
                  <ThemeUI.Input
                    id="heroTitle"
                    name="heroTitle"
                    value={promotionData.hero.title}
                    onChange={(e) =>
                      handlePromotionInputChange(
                        "hero",
                        null,
                        "title",
                        e.target.value
                      )
                    }
                    placeholder="Ride with us - 20% Off Your Next Trip!"
                    error={backendErrors.hero_title}
                  />
                </div>
              </div>
            </div>
            {/* Ad Sections */}
            <div className="mb-10">
              <div className="flex items-center mb-4">
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center mr-3"
                  style={{
                    background: `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})`,
                  }}
                >
                  <span className="text-white font-medium">2</span>
                </div>
                <h3 className="text-lg font-medium">Banner Ads</h3>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {promotionData.ads.map((ad, index) => (
                  <div
                    key={index}
                    className=" rounded-lg p-6 border border-gray-200"
                  >
                    <h4
                      className="text-md font-medium mb-4"
                      style={{ color: theme.primaryGradientStart }}
                    >
                      Ad {index + 1}
                    </h4>
                    <div className="space-y-3">
                      {/* Ad Images */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1">
                            <label
                              htmlFor={`adImages_${index}`}
                              className="block text-sm font-medium text-gray-700"
                            >
                              Ad Images
                            </label>
                            <span className="text-red-500">*</span>
                          </div>
                          <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            Up to 5 images (800×600px)
                          </span>
                        </div>
                        <ThemeUI.MultiFileInput
                          id={`adImages_${index}`}
                          name={`adImages_${index}`}
                          onChange={(e) => handleAdImagesChange(e, index)}
                          accept="image/png,image/jpeg,image/jpg"
                          files={ad.images}
                          onDeleteFile={(fileIndex) =>
                            handleAdImageDelete(index, fileIndex)
                          }
                          maxFiles={5}
                          maxSize={5}
                          placeholder="Drag and drop ad images here or click to browse"
                          error={backendErrors[`ad_${index}_images`]}
                        />
                        {ad.images.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            {ad.images.length} of 5 images selected
                          </p>
                        )}
                      </div>
                      {/* Ad Title */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label
                            htmlFor={`adImageTitle_${index}`}
                            className="block text-sm font-medium text-gray-700"
                          >
                            Ad Title
                          </label>
                          <div className="flex items-center gap-2">
                            <ThemeUI.Checkbox
                              id={`adImageTitleEnabled_${index}`}
                              name={`adImageTitleEnabled_${index}`}
                              checked={ad.isImageTitleEnabled}
                              onChange={() =>
                                handleCheckboxChange(
                                  "ads",
                                  index,
                                  "isImageTitleEnabled"
                                )
                              }
                            />
                            <label
                              htmlFor={`adImageTitleEnabled_${index}`}
                              className="text-sm text-gray-700"
                            >
                              Show Title
                            </label>
                          </div>
                        </div>
                        <ThemeUI.Input
                          id={`adImageTitle_${index}`}
                          name={`adImageTitle_${index}`}
                          value={ad.imageTitle}
                          onChange={(e) =>
                            handlePromotionInputChange(
                              "ads",
                              index,
                              "imageTitle",
                              e.target.value
                            )
                          }
                          placeholder="Try us Share - Save More!"
                          error={backendErrors[`ad_${index}_imageTitle`]}
                          disabled={!ad.isImageTitleEnabled}
                        />
                      </div>
                      {/* Call to Action Button */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="block text-sm font-medium text-gray-700">
                            Call to Action Button
                          </label>
                          <div className="flex items-center gap-2">
                            <ThemeUI.Checkbox
                              id={`adButtonEnabled_${index}`}
                              name={`adButtonEnabled_${index}`}
                              checked={ad.isButtonEnabled}
                              onChange={() =>
                                handleCheckboxChange(
                                  "ads",
                                  index,
                                  "isButtonEnabled"
                                )
                              }
                            />
                            <label
                              htmlFor={`adButtonEnabled_${index}`}
                              className="text-sm text-gray-700"
                            >
                              Show Button
                            </label>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <ThemeUI.Input
                              id={`adButtonText_${index}`}
                              name={`adButtonText_${index}`}
                              value={ad.buttonText}
                              onChange={(e) =>
                                handlePromotionInputChange(
                                  "ads",
                                  index,
                                  "buttonText",
                                  e.target.value
                                )
                              }
                              placeholder="Book Now"
                              disabled={!ad.isButtonEnabled}
                              error={backendErrors[`ad_${index}_buttonText`]}
                              label="Button Text"
                            />
                          </div>
                          <div>
                            <ThemeUI.Input
                              id={`adLink_${index}`}
                              name={`adLink_${index}`}
                              value={ad.link}
                              onChange={(e) =>
                                handlePromotionInputChange(
                                  "ads",
                                  index,
                                  "link",
                                  e.target.value
                                )
                              }
                              placeholder="Us://book-ride/share"
                              disabled={!ad.isButtonEnabled}
                              error={backendErrors[`ad_${index}_link`]}
                              label="Button Link"
                            />
                          </div>
                        </div>
                        {ad.isButtonEnabled && (
                          <p className="text-xs text-gray-500">
                            Deep links should use the 'Us://' protocol
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Save Button */}
            <div className="flex justify-end mt-8">
              <ThemeUI.Button
                type="button"
                onClick={handlePromotionSubmit}
                loading={isSubmitting}
                gradientColors={{
                  start: theme.primaryGradientStart,
                  end: theme.primaryGradientEnd,
                }}
                direction={theme.gradientDirection}
                className="px-6"
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <Loader className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                    <span>Saving Changes...</span>
                  </div>
                ) : (
                  <>Save Changes</>
                )}
              </ThemeUI.Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Layout>
      <div className="flex flex-row justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Trips</h1>
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
              Trips
            </li>
          </ol>
        </nav>
      </div>
      <div className="mb-4">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              className={`mr-8 py-3 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === "manageTrips"
                  ? `border-b-2`
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              style={{
                borderColor:
                  activeTab === "manageTrips"
                    ? theme.primaryGradientStart
                    : "transparent",
                color:
                  activeTab === "manageTrips"
                    ? theme.primaryGradientStart
                    : undefined,
              }}
              onClick={() => handleTabChange("manageTrips")}
            >
              <Map className="w-5 h-5 mr-2" />
              Manage Trips
            </button>
            <button
              className={`mr-8 py-3 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === "promotion"
                  ? `border-b-2`
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              style={{
                borderColor:
                  activeTab === "promotion"
                    ? theme.primaryGradientStart
                    : "transparent",
                color:
                  activeTab === "promotion"
                    ? theme.primaryGradientStart
                    : undefined,
              }}
              onClick={() => handleTabChange("promotion")}
            >
              <Car className="w-5 h-5 mr-2" />
              Banner
            </button>
          </nav>
        </div>
      </div>
      <div className="py-4">
        {activeTab === "manageTrips"
          ? renderTripCards()
          : renderPromotionContent()}
      </div>
    </Layout>
  )
}

export default Trips
