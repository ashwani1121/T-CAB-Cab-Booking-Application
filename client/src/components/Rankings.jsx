import { useState, useEffect, useCallback, useMemo } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import Layout from "./Layout"
import { useTheme } from "../context/themeContext"
import { ThemeUI } from "../context/themeUI"
import { ChevronRight, Loader, Search, Filter, Star, Trophy, Calendar, Image } from "lucide-react"
import Offcanvas from "./Offcanvas"
import { AgGridReact } from "ag-grid-react"
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community"
import NoRowsOverlay from "./NoRowsOverlay"
ModuleRegistry.registerModules([AllCommunityModule])

function Rankings(){
    const { theme }                                             = useTheme();
    const [activeTab, setActiveTab]                             = useState("rankings");
    const [isLoading, setIsLoading]                             = useState(false);
    const [totalRows, setTotalRows]                             = useState(0);
    const [perPage, setPerPage]                                 = useState(10);
    const [currentPage, setCurrentPage]                         = useState(1);
    const [rankings, setRankings]                               = useState([]);
    const [searchQuery, setSearchQuery]                         = useState("");
    const today                                                 = new Date().toISOString().split("T")[0];
    const [filters, setFilters]                                 = useState({
        date_from : today,
        date_to   : today,
        state_id  : ''
    });
    const [states, setStates]                                   = useState([]);
    const [isFilterOffcanvasOpen, setIsFilterOffcanvasOpen]     = useState(false);
    const [placeholder, setPlaceholder]                         = useState("Search by name...");
    const [currentWordIndex, setCurrentWordIndex]               = useState(0);
    const [currentCharIndex, setCurrentCharIndex]               = useState(0);
    const [isDeleting, setIsDeleting]                           = useState(false);
    const words                                                 = ["name", "email", "mobile"];
    const [rankingImages, setRankingImages]                     = useState({
        ranking_image     : null,
        leaderboard_image : null
    });
    const [rankingImageFile, setRankingImageFile]               = useState(null);
    const [rankingImagePreview, setRankingImagePreview]         = useState(null);
    const [leaderboardImageFile, setLeaderboardImageFile]       = useState(null);
    const [leaderboardImagePreview, setLeaderboardImagePreview] = useState(null);
    const [backendErrors, setBackendErrors]                     = useState({});
    const [isSavingImages, setIsSavingImages]                   = useState(false);

    // Fetch driver rankings on mount and when pagination/search/filters change
    useEffect(() => {
        if(activeTab === "rankings"){
            fetchTopDrivers(currentPage, perPage, searchQuery, filters)
        }
    }, [currentPage, perPage, searchQuery, filters, activeTab])

    // Update the useEffect that fetches ranking images to set previews
    useEffect(() => {
        const fetchRankingImages = async () => {
            try{
                const response = await axios.get(
                    `${import.meta.env.VITE_API_URL}/admin/rankings/winners-banner`
                );
                if(response.data.success && response.data.data) {
                    setRankingImages({
                        ranking_image: response.data.data.ranking_image_url,
                        leaderboard_image: response.data.data.leaderboard_image_url
                    });
                    // Set previews from existing images
                    setRankingImagePreview(response.data.data.ranking_image_url);
                    setLeaderboardImagePreview(response.data.data.leaderboard_image_url);
                }
            }catch(err){
                console.error('Error fetching settings images:', err);
            }
        };
        fetchRankingImages();
    }, []);
    
    // Typing animation for placeholder
    useEffect(() => {
        const typingSpeed = isDeleting ? 50 : 100
        const pauseTime   = 1500
        const timeout     = setTimeout(() => {
            const currentWord = words[currentWordIndex]
            if(!isDeleting && currentCharIndex < currentWord.length){
                setPlaceholder(
                    `Search by ${currentWord.substring(0, currentCharIndex + 1)}...`
                )
                setCurrentCharIndex((prev) => prev + 1)
            }else 
            if(isDeleting && currentCharIndex > 0){
                setPlaceholder(
                    `Search by ${currentWord.substring(0, currentCharIndex - 1)}...`
                )
                setCurrentCharIndex((prev) => prev - 1)
            }else 
            if(!isDeleting && currentCharIndex === currentWord.length) {
                setTimeout(() => setIsDeleting(true), pauseTime)
            }else 
            if(isDeleting && currentCharIndex === 0) {
                setIsDeleting(false)
                setCurrentWordIndex((prev) => (prev + 1) % words.length)
            }
        }, typingSpeed)
        return () => clearTimeout(timeout)
    }, [currentCharIndex, currentWordIndex, isDeleting, words])

    // Memoized fetch function
    const fetchTopDrivers = useCallback(
        async (page, limit, search, filters) => {
            setIsLoading(true)
            try{
                const [topDriversResponse, statesResponse] = await Promise.all([
                    axios.get(`${import.meta.env.VITE_API_URL}/admin/rankings`, {
                        params: {
                            page,
                            limit,
                            search,
                            date_from : filters.date_from || "",
                            date_to   : filters.date_to || "",
                            state_id  : filters.state_id || ""
                        },
                    }),
                    axios.get(`${import.meta.env.VITE_API_URL}/admin/vehicle-prices/states`),
                ]);
                setRankings(topDriversResponse.data.data.rides)
                setStates(statesResponse.data.data || []);
                setTotalRows(topDriversResponse.data.data.pagination.total_items || 0)
            }catch(err){
                console.error("Error fetching driver rankings:", err)
                toast.error(err.topDriversResponse?.data?.message || "Failed to fetch driver rankings")
                setRankings([])
                setTotalRows(0)
            }finally{
                setIsLoading(false)
            }
        },
        []
    )

    // Handle search
    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value)
        setCurrentPage(1)
    }

    // Handle filter change
    const handleFilterChange = (name, value) => {
        setFilters((prev) => ({ ...prev, [name]: value }))
        setCurrentPage(1)
    }

    // Handle pagination
    const handlePageChange = (page) => {
        setCurrentPage(page)
    }

    // Handle tab change
    const handleTabChange = (tabId) => {
        setActiveTab(tabId)
    }

    // Rank badge component
    const RankBadge = ({ rank }) => {
        const getBadgeStyle = (rank) => {
            if(rank === 1) return { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '🥇' }
            if(rank === 2) return { bg: 'bg-gray-100', text: 'text-gray-800', icon: '🥈' }
            if(rank === 3) return { bg: 'bg-orange-100', text: 'text-orange-800', icon: '🥉' }
            return { bg: 'bg-blue-100', text: 'text-blue-800', icon: '🏆' }
        }
        const style = getBadgeStyle(rank)
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                <span className="mr-1">{style.icon}</span>
                #{rank}
            </span>
        )
    }

    // Rating display component
    const RatingDisplay = ({ rating, showStars = true }) => {
        const numRating = parseFloat(rating) || 0
        return (
            <div className="flex items-center gap-1">
                {showStars && (
                    <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                                key={star}
                                size={14}
                                className={`${
                                    star <= numRating
                                        ? 'text-yellow-400 fill-yellow-400'
                                        : 'text-gray-300'
                                }`}
                            />
                        ))}
                    </div>
                )}
                <span className="text-sm font-medium">{numRating.toFixed(1)}</span>
            </div>
        )
    }

    // Profile image component
    const ProfileImage = ({ src, name }) => {
        const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'DR'
        return (
            <div className="flex items-center gap-2">
                {src ? (
                    <img 
                        src={src} 
                        alt={name}
                        className="w-8 h-8 rounded-full object-cover"
                    />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium">
                        {initials}
                    </div>
                )}
            </div>
        )
    }

    // File change handlers
    const handleRankingImageChange = (e) => {
        const file = e.target.files[0];
        if(file){
            setRankingImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setRankingImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
            setBackendErrors(prev => ({ ...prev, ranking_image: null }));
        }
    };
    const handleLeaderboardImageChange = (e) => {
        const file = e.target.files[0];
        if(file){
            setLeaderboardImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLeaderboardImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
            setBackendErrors(prev => ({ ...prev, leaderboard_image: null }));
        }
    };
    // File delete handlers
    const handleRankingImageDelete = () => {
        setRankingImageFile(null);
        setRankingImagePreview(rankingImages.ranking_image);
    };
    const handleLeaderboardImageDelete = () => {
        setLeaderboardImageFile(null);
        setLeaderboardImagePreview(rankingImages.leaderboard_image);
    };

    // Save images handler
    const handleSaveImages = async () => {
        setIsSavingImages(true);
        setBackendErrors({});
        try{
            const formData = new FormData();
            if(rankingImageFile){
                formData.append('ranking_image', rankingImageFile);
            }
            if(leaderboardImageFile){
                formData.append('leaderboard_image', leaderboardImageFile);
            }
            const response = await axios.post(
                `${import.meta.env.VITE_API_URL}/admin/rankings/winners-banner`,formData,{
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            if(response.data.success){
                toast.success(response.data.message || "Winner banners updated successfully");
                // Update the ranking images state
                setRankingImages({
                    ranking_image: response.data.data.ranking_image_url,
                    leaderboard_image: response.data.data.leaderboard_image_url
                });
                // Clear the file states
                setRankingImageFile(null);
                setLeaderboardImageFile(null);
            }
        }catch(err){
            console.error("Error saving winner banners:", err);
            if(err.response?.data?.errors){
                setBackendErrors(err.response.data.errors);
            }
            toast.error(err.response?.data?.message || "Failed to update winner banners");
        }finally{
            setIsSavingImages(false);
        }
    };

    // DataTable columns
    const columnDefs = useMemo(
        () => [
            {
                headerName: "Rank",
                field: "rank",
                sortable: true,
                Width: 80,
                suppressSizeToFit: true,
                cellRenderer: (params) => <RankBadge rank={params.value} />
            },
            {
                headerName: "Driver",
                field: "name",
                sortable: true,
                minWidth: 250,
                cellRenderer: (params) => (
                    <div className="flex items-center gap-2 py-1">
                        <ProfileImage src={params.data.profile_image} name={params.value} />
                        <div>
                            <div className="font-medium text-sm">{params.value}</div>
                            <div className="text-xs text-gray-500">{params.data.email}</div>
                        </div>
                    </div>
                )
            },
            {
                headerName: "Mobile",
                field: "mobile",
                sortable: true,
                minWidth: 120,
                cellRenderer: (params) => (
                    <div className="text-sm font-mono">{params.value}</div>
                )
            },
            {
                headerName: "Total Trips",
                field: "total_trips",
                sortable: true,
                minWidth: 70,
                suppressSizeToFit: true,
                cellRenderer: (params) => (
                    <div className="text-center">
                        <div className="text-lg font-bold">{params.value}</div>
                        <div className="text-xs text-gray-500">trips</div>
                    </div>
                )
            },
            {
                headerName: "Avg Rating",
                field: "average_rating",
                sortable: true,
                minWidth: 130,
                cellRenderer: (params) => <RatingDisplay rating={params.value} />
            },
            {
                headerName: "Score",
                field: "ranking_score",
                sortable: true,
                minWidth: 70,
                suppressSizeToFit: true,
                cellRenderer: (params) => (
                    <div className="text-center">
                        <div className="text-lg font-bold" style={{ color: theme.primaryGradientStart }}>
                            {params.value}
                        </div>
                        <div className="text-xs text-gray-500">points</div>
                    </div>
                )
            },
            {
                headerName: "Status",
                field: "driver_status",
                sortable: true,
                minWidth: 80,
                suppressSizeToFit: true,
                cellRenderer: (params) => {
                    const status = params.value
                    const statusConfig = {
                        approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
                        pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
                        rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
                        suspended: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Suspended' }
                    }
                    const config = statusConfig[status] || statusConfig.pending
                    
                    return (
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
                            {config.label}
                        </span>
                    )
                }
            },
            {
                headerName: "Joined",
                field: "joined_date",
                sortable: true,
                minWidth: 80,
                cellRenderer: (params) => {
                    const date = new Date(params.value)
                    return (
                        <div className="flex items-center gap-1">
                            <Calendar size={14} className="text-gray-400" />
                            <span className="text-sm">{date.toLocaleDateString()}</span>
                        </div>
                    )
                }
            }
        ],
        [theme.primaryGradientStart]
    )

    return(
        <Layout>
            {/* Header and breadcrumb */}
            <div className="flex items-center mb-4">
                <div className="flex items-center gap-2 flex-1">
                    <h1 className="text-2xl font-bold max-sm:text-xl">Rankings And Leaderboards</h1>
                </div>
                <nav className="flex items-center text-sm text-gray-500 whitespace-nowrap overflow-x-auto">
                    <ol className="flex items-center">
                        <li>
                            <a href="/dashboard" className="hover:text-blue-600 transition-colors">Home</a>
                        </li>
                        <li className="flex items-center">
                            <ChevronRight className="h-4 w-4 mx-1" />
                        </li>
                        <li style={{ color: theme.primaryGradientStart }} className="font-medium">
                            Rankings
                        </li>
                    </ol>
                </nav>
            </div>
            {/* Tabs */}
            <div className="flex justify-center mb-4">
                <div className="inline-flex rounded-md shadow-sm" role="group">
                    {[
                        { id: "rankings", label: "Driver Rankings", icon: Trophy, isFirst: true },
                        { id: "banners", label: "Winner Banners", icon: Image, isLast: true },
                    ].map(({ id, label, icon: Icon, isFirst, isLast }) => (
                        <button
                            key={id}
                            type="button"
                            className={`px-6 py-3 text-sm font-medium flex items-center transition-all duration-200 ${
                                isFirst ? "rounded-l-md" : isLast ? "rounded-r-md" : ""
                            } ${
                                activeTab === id
                                    ? "text-white border-transparent"
                                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                            }`}
                            style={
                                activeTab === id
                                    ? {
                                        background: `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})`,
                                    }
                                    : {}
                            }
                            onClick={() => handleTabChange(id)}
                        >
                            <Icon className="w-5 h-5 mr-2" />
                            <span className="max-sm:hidden">{label}</span>
                            <span className="sm:hidden">{label.split(' ')[0]}</span>
                        </button>
                    ))}
                </div>
            </div>
            {/* Tab Content */}
            {activeTab === "rankings" && (
                <>
                    {/* Search and filter controls */}
                    <div className="mb-4 rounded-lg w-full">
                        <div className="flex justify-between items-center gap-2">
                            <div className="w-full max-sm:flex-1 sm:w-1/3">
                                <ThemeUI.Input
                                    id             = "search"
                                    name           = "search"
                                    value          = {searchQuery}
                                    className      = "bg-white border border-gray-300 rounded-md p-2 hover:border-gray-500 transition-colors"
                                    onChange       = {handleSearchChange}
                                    placeholder    = {placeholder}
                                    leftElement    = {<Search size={16} className="text-gray-400" />}
                                />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 w-full max-sm:w-fit sm:w-auto h-full">
                                <ThemeUI.Button
                                    type           = "button"
                                    onClick        = {() => setIsFilterOffcanvasOpen(true)}
                                    gradientColors = {{
                                        start: theme.secondaryGradientStart,
                                        end: theme.secondaryGradientEnd,
                                    }}
                                    direction      = {theme.gradientDirection}
                                    aria-label     = "Open filter options"
                                >
                                    <Filter size={16} className="sm:mr-2" />
                                    <p className="max-sm:hidden">Filters</p>
                                </ThemeUI.Button>
                            </div>
                        </div>
                    </div>
                    {/* DataTable with horizontal scroll wrapper */}
                    <div style={{"--header-gradient": `linear-gradient(${theme.gradientDirection}, ${theme.primaryGradientStart}, ${theme.primaryGradientEnd})`}}>
                        <AgGridReact
                            className                    = "custom-ag-grid"
                            domLayout                    = "autoHeight"
                            theme                        = {themeQuartz.withParams({
                                spacing                  : 7,
                                headerHeight             : 45,
                                headerFontSize           : 16,
                                fontSize                 : 13,
                                headerTextColor          : "white",
                                paginationPanelHeight    : 50,
                            })}
                            defaultColDef                = {{
                                resizable                : false,
                                suppressSizeToFit        : false,
                            }}
                            rowData                      = {rankings}
                            rowHeight                    = {65}
                            columnDefs                   = {columnDefs}
                            pagination
                            paginationPageSize           = {10}
                            paginationPageSizeSelector   = {[10, 20, 50, 100]}
                            paginationNumberFormatter    = {(params) => `${params.value}`}
                            suppressCellFocus
                            suppressPaginationPanel      = {false}
                            overlayLoadingTemplate       = {'<span class="p-4">Loading...</span>'}
                            noRowsOverlayComponent       = {NoRowsOverlay}
                            noRowsOverlayComponentParams = {{ text: "No Driver Rankings Found" }}
                            onPaginationChanged          = {(params) => {
                                if(params.api){
                                    const newPage = params.api.paginationGetCurrentPage() + 1
                                    handlePageChange(newPage)
                                }
                            }}
                        />
                    </div>
                </>
            )}
            {activeTab === "banners" && (
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold">Winner Banners</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Upload images for the ranking and leaderboard winner banners
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Ranking Image */}
                        <ThemeUI.FormField
                            label="Ranking Winner Banner"
                            name="ranking_image"
                            error={backendErrors.ranking_image}
                            required={true}
                        >
                            <ThemeUI.FileInput
                                id="rankingImage"
                                name="ranking_image"
                                onChange={handleRankingImageChange}
                                accept="image/png,image/jpeg,image/jpg"
                                preview={rankingImagePreview}
                                onDelete={handleRankingImageDelete}
                                error={backendErrors.ranking_image}
                                showDeleteIcon={false}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Recommended: 16:9 aspect ratio (e.g., 1920x1080px)
                            </p>
                        </ThemeUI.FormField>
                        {/* Leaderboard Image */}
                        <ThemeUI.FormField
                            label="Leaderboard Winner Banner"
                            name="leaderboard_image"
                            error={backendErrors.leaderboard_image}
                            required={true}
                        >
                            <ThemeUI.FileInput
                                id="leaderboardImage"
                                name="leaderboard_image"
                                onChange={handleLeaderboardImageChange}
                                accept="image/png,image/jpeg,image/jpg"
                                preview={leaderboardImagePreview}
                                onDelete={handleLeaderboardImageDelete}
                                error={backendErrors.leaderboard_image}
                                showDeleteIcon={false}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Recommended: 16:9 aspect ratio (e.g., 1920x1080px)
                            </p>
                        </ThemeUI.FormField>
                    </div>
                    {/* Save Button */}
                    <div className="mt-6 flex justify-end">
                        <ThemeUI.Button
                            type="button"
                            onClick={handleSaveImages}
                            disabled={isSavingImages || (!rankingImageFile && !leaderboardImageFile)}
                            gradientColors={{
                                start: theme.primaryGradientStart,
                                end: theme.primaryGradientEnd,
                            }}
                            direction={theme.gradientDirection}
                        >
                            {isSavingImages ? (
                                <>
                                    <Loader size={16} className="animate-spin mr-2" />
                                    Saving...
                                </>
                            ) : (
                                "Save Banners"
                            )}
                        </ThemeUI.Button>
                    </div>
                </div>
            )}
            {/* Filter Offcanvas */}
            <Offcanvas
                isOpen   = {isFilterOffcanvasOpen}
                onClose  = {() => setIsFilterOffcanvasOpen(false)}
                title    = "Filter Options"
                position = "right"
                size     = "md"
            >
                <div className="space-y-4">
                    <ThemeUI.FormField label="Date From">
                        <ThemeUI.Input
                            type     = "date"
                            value    = {filters.date_from}
                            onChange = {(e) => handleFilterChange("date_from", e.target.value)}
                        />
                    </ThemeUI.FormField>
                    <ThemeUI.FormField label="Date To">
                        <ThemeUI.Input
                            type     = "date"
                            value    = {filters.date_to}
                            onChange = {(e) => handleFilterChange("date_to", e.target.value)}
                        />
                    </ThemeUI.FormField>
                    <ThemeUI.FormField label="State">
                        <ThemeUI.Select
                            value    = {filters.state_id}
                            onChange = {(selected) =>
                                handleFilterChange("state_id", selected?.value || "")
                            }
                            options  = {states.map((state) => ({
                                value: state.id.toString(),
                                label: state.state_name
                            }))}
                            placeholder  = "Select a state"
                            isClearable
                            isSearchable = {false}
                        />
                    </ThemeUI.FormField>
                    <div className="flex gap-2">
                        <ThemeUI.Button
                            type     = "button"
                            disabled = {isLoading}
                            onClick  = {() => {
                                setFilters({
                                    date_from: "",
                                    date_to: "",
                                    state_id : ""
                                })
                                setCurrentPage(1)
                                setIsFilterOffcanvasOpen(false)
                            }}
                            gradientColors = {{
                                start: theme.secondaryGradientStart,
                                end: theme.secondaryGradientEnd,
                            }}
                        >
                        Reset Filters
                        </ThemeUI.Button>
                    </div>
                </div>
            </Offcanvas>
        </Layout>
    )
}
export default Rankings;