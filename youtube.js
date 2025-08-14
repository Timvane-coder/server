const fs = require('fs-extra')  
const { getTemporaryPath, formatSeconds } = require('./util.js')  
const { convertMp4ToMp3 } = require('./video.js')  
const Youtube = require('youtube-sr').default  
const ytdl = require('@distube/ytdl-core')  
const axios = require('axios')  

// Enhanced agent with more realistic headers and updated cookies
const yt_agent = ytdl.createAgent([
    { 
        name: 'cookie1', 
        value: 'GPS=1; YSC=CkypMSpfgiI; VISITOR_INFO1_LIVE=4nF8vxPW1gU; VISITOR_PRIVACY_METADATA=CgJCUhIEGgAgZA%3D%3D; PREF=f6=40000000&tz=America.Sao_Paulo'
    }
], {
    // Add more realistic headers
    headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
    }
})

// Enhanced error handling and retry mechanism
const getYoutubeVideoInfo = async (text, retryCount = 0) => {  
    return new Promise(async (resolve, reject) => {  
        try {  
            let response = {}, video_id = ''  
              
            // Check if the URL is valid  
            const VALID_URL = ytdl.validateURL(text)  
            if (VALID_URL) {  
                video_id = ytdl.getVideoID(text)  
            } else {  
                try {
                    const videoSearch = await Youtube.searchOne(text, { 
                        limit: 1, 
                        type: 'video',
                        requestOptions: {
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                            }
                        }
                    })
                    video_id = videoSearch.id  
                } catch (searchError) {
                    console.log('Search error:', searchError.message)
                    response.error = 'Video not found. Please check your search term and try again.'  
                    return reject(response)  
                }
            }  

            console.log(`Attempting to get info for video ID: ${video_id}`)

            // Enhanced ytdl options with multiple fallbacks
            const ytdlOptions = {  
                playerClients: ["WEB", "WEB_EMBEDDED", "ANDROID", "IOS"],  
                agent: yt_agent,
                requestOptions: {
                    timeout: 15000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': '*/*',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Sec-Fetch-Dest': 'empty',
                        'Sec-Fetch-Mode': 'cors',
                        'Sec-Fetch-Site': 'same-origin',
                    }
                }
            }

            // Get video information with enhanced error handling
            ytdl.getInfo(video_id, ytdlOptions).then(videoInfo => {  
                console.log('Successfully retrieved video info')
                
                // Check if video info is valid
                if (!videoInfo.player_response || !videoInfo.player_response.videoDetails) {
                    throw new Error('Invalid video information received')
                }

                const videoDetails = videoInfo.player_response.videoDetails
                const formats = ytdl.filterFormats(videoInfo.formats, "videoandaudio")  
                const format = ytdl.chooseFormat(formats, { quality: 'highest' })  
                
                // Extract thumbnails with fallback
                let thumbnail = `https://img.youtube.com/vi/${video_id}/maxresdefault.jpg`
                let thumbnails = []
                
                try {
                    thumbnails = videoDetails.thumbnail?.thumbnails || []
                    if (thumbnails.length > 0) {
                        const highestThumbnail = thumbnails.reduce((prev, current) => 
                            (prev.width * prev.height > current.width * current.height) ? prev : current
                        )
                        thumbnail = highestThumbnail.url
                    }
                } catch (thumbError) {
                    console.log('Thumbnail extraction error:', thumbError.message)
                }

                response.result = {  
                    videoId: videoDetails.videoId,  
                    title: videoDetails.title,  
                    shortDescription: videoDetails.shortDescription || 'No description available',  
                    lengthSeconds: videoDetails.lengthSeconds,  
                    keywords: videoDetails.keywords || [],  
                    channelId: videoDetails.channelId || videoDetails.author,
                    author: videoDetails.author,
                    viewCount: parseInt(videoDetails.viewCount) || 0,
                    likeCount: extractLikeCount(videoInfo.player_response.engagementPanels),
                    isOwnerViewing: videoDetails.isOwnerViewing || false,  
                    isCrawlable: videoDetails.isCrawlable !== false,  
                    durationFormatted: formatSeconds(parseInt(videoDetails.lengthSeconds)),  
                    thumbnail: thumbnail,
                    thumbnails: thumbnails,
                    publishDate: videoInfo.player_response.microformat?.playerMicroformatRenderer?.publishDate || null,
                    uploadDate: videoInfo.player_response.microformat?.playerMicroformatRenderer?.uploadDate || null,
                    category: videoInfo.player_response.microformat?.playerMicroformatRenderer?.category || null,
                    format: format || null
                }  
                resolve(response)  
            }).catch(async (err) => {  
                console.log('ytdl.getInfo error:', err.message)
                
                // Implement retry logic with exponential backoff
                if (retryCount < 2) {
                    console.log(`Retrying... Attempt ${retryCount + 1}`)
                    await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 2000))
                    return getYoutubeVideoInfo(text, retryCount + 1).then(resolve).catch(reject)
                }
                
                if (err.message.includes("410") || err.message.includes("private") || err.message.includes("unavailable")) {  
                    response.error = 'This video is private, age-restricted, or unavailable in your region.'  
                } else if (err.message.includes("403") || err.message.includes("forbidden")) {
                    response.error = 'Access denied. The video may be region-blocked or require authentication.'
                } else if (err.message.includes("429") || err.message.includes("rate")) {
                    response.error = 'Rate limited by YouTube. Please try again in a few minutes.'
                } else if (err.message.includes("timeout")) {
                    response.error = 'Request timed out. Please check your internet connection and try again.'
                } else {  
                    response.error = `Unable to retrieve video information: ${err.message}`  
                }  
                reject(response)  
            })  
        } catch (err) {  
            console.log(`API getYoutubeVideoInfo - ${err.message}`)  
            reject({ error: `Server error: ${err.message}` })  
        }  
    })  
}  

// Enhanced related videos function with better error handling
const getRelatedVideos = async (videoId, retryCount = 0) => {
    return new Promise(async (resolve, reject) => {
        try {
            let response = {}
            
            console.log(`Getting related videos for: ${videoId}`)
            
            // Get video info first to extract related videos
            const ytdlOptions = {
                playerClients: ["WEB", "WEB_EMBEDDED"],
                agent: yt_agent,
                requestOptions: {
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                }
            }

            ytdl.getInfo(videoId, ytdlOptions).then(async (videoInfo) => {
                // Try to get related videos from search based on video title/keywords
                const title = videoInfo.player_response.videoDetails.title;
                const keywords = videoInfo.player_response.videoDetails.keywords || [];
                const channelName = videoInfo.player_response.videoDetails.author;
                
                // Create search query from title and keywords
                let searchQueries = [
                    title, // Original title
                    keywords.slice(0, 3).join(' '), // Top keywords
                    `${channelName} songs`, // Channel related content
                    title.split(' ').slice(0, 3).join(' ') // First 3 words of title
                ].filter(query => query && query.trim().length > 0)

                // Try different search strategies
                for (let query of searchQueries) {
                    try {
                        const searchResults = await Youtube.search(query, { 
                            limit: 15, 
                            type: 'video',
                            requestOptions: {
                                headers: {
                                    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                                }
                            }
                        })
                        
                        // Filter out the original video and format results
                        const relatedVideos = searchResults
                            .filter(video => video.id !== videoId && video.type === 'video')
                            .slice(0, 8)
                            .map(video => ({
                                videoId: video.id,
                                title: video.title || 'Unknown Title',
                                channelTitle: video.channel ? video.channel.name : 'Unknown Channel',
                                channelId: video.channel ? video.channel.id : null,
                                viewCount: video.views || 0,
                                durationFormatted: video.duration ? formatSeconds(video.duration) : 'Unknown',
                                thumbnail: video.thumbnail ? video.thumbnail.url : `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`,
                                publishedTimeText: video.uploadedAt || 'Unknown',
                                description: video.description || ''
                            }));

                        if (relatedVideos.length > 0) {
                            response.result = relatedVideos;
                            return resolve(response);
                        }
                    } catch (searchError) {
                        console.log(`Search failed for query "${query}":`, searchError.message)
                        continue; // Try next query
                    }
                }
                
                // If all searches failed, return empty array
                response.result = [];
                resolve(response);

            }).catch(async (error) => {
                console.log('Related videos error:', error.message)
                
                // Retry logic
                if (retryCount < 1) {
                    console.log(`Retrying related videos... Attempt ${retryCount + 1}`)
                    await new Promise(resolve => setTimeout(resolve, 3000))
                    return getRelatedVideos(videoId, retryCount + 1).then(resolve).catch(reject)
                }
                
                response.error = 'Failed to fetch related videos'
                reject(response)
            });

        } catch (err) {
            console.log(`API getRelatedVideos - ${err.message}`);
            reject({ error: 'There was an error fetching related videos.' });
        }
    });
}

// Enhanced MP4 download with better error handling and progress tracking
const getYoutubeMP4 = async (text, progressCallback) => {  
    return new Promise(async (resolve, reject) => {  
        try {  
            let response = {}  
            let videoOutput = getTemporaryPath('mp4')  
            
            console.log('Getting video info for MP4 download...')
            let videoInfoResponse = await getYoutubeVideoInfo(text)
            let videoInfo = videoInfoResponse.result
              
            if (!videoInfo) {  
                return reject({ error: "Failed to retrieve video information for download." })  
            }  

            console.log(`Starting MP4 download for: ${videoInfo.title}`)

            // Enhanced download options
            const downloadOptions = {
                format: videoInfo.format,
                agent: yt_agent,
                requestOptions: {
                    timeout: 30000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': '*/*',
                        'Accept-Encoding': 'gzip, deflate, br'
                    }
                }
            }

            let videoStream = ytdl(videoInfo.videoId, downloadOptions)  
            let totalSize = 0;
            let downloadedSize = 0;
            let writeStream = fs.createWriteStream(videoOutput)
            
            // Enhanced error handling for stream
            videoStream.on('error', (error) => {
                console.log('Video stream error:', error.message);
                writeStream.destroy()
                if (fs.existsSync(videoOutput)) {
                    fs.unlinkSync(videoOutput)
                }
                response.error = `Download failed: ${error.message}`
                reject(response)
            })
            
            writeStream.on('error', (error) => {
                console.log('Write stream error:', error.message);
                response.error = `File write error: ${error.message}`
                reject(response)
            })
            
            // Track download progress
            videoStream.on('response', (httpResponse) => {
                totalSize = parseInt(httpResponse.headers['content-length']) || 0;
                console.log(`Download started, total size: ${totalSize} bytes`)
            });
            
            videoStream.on('data', (chunk) => {
                downloadedSize += chunk.length;
                if (totalSize > 0 && progressCallback) {
                    const progress = Math.round((downloadedSize / totalSize) * 100);
                    progressCallback(progress);
                }
            });
            
            videoStream.pipe(writeStream)
              
            videoStream.on("end", () => {  
                console.log('Download completed')
                try {
                    let videoBuffer = fs.readFileSync(videoOutput)  
                    fs.unlinkSync(videoOutput)  
                    response.result = videoBuffer  
                    resolve(response)
                } catch (readError) {
                    console.log('Error reading downloaded file:', readError.message)
                    response.error = "Error reading downloaded video file"
                    reject(response)
                }
            })
        } catch (err) {  
            console.log(`API getYoutubeMP4 - ${err.message}`)  
            reject({ error: `Server error while downloading video: ${err.message}` })  
        }  
    })  
}  

// Enhanced MP3 conversion with better error handling
const getYoutubeMP3 = async (text, progressCallback) => {  
    return new Promise(async (resolve, reject) => {  
        try {  
            console.log('Starting MP3 conversion process...')
            let response = {}  
            
            // Add progress tracking for video download phase
            const videoProgressCallback = (progress) => {
                if (progressCallback) {
                    // Video download is 70% of total process
                    progressCallback(Math.round(progress * 0.7))
                }
            }
            
            let videoResult = await getYoutubeMP4(text, videoProgressCallback)
            
            if (progressCallback) {
                progressCallback(70) // Video download complete
            }
            
            console.log('Converting MP4 to MP3...')
            let audioResult = await convertMp4ToMp3(videoResult.result)
            
            if (progressCallback) {
                progressCallback(100) // Conversion complete
            }
            
            response.result = audioResult.result  
            resolve(response)  
        } catch (err) {  
            console.log(`API getYoutubeMP3 - ${err.message}`)  
            reject({ error: `Error during MP3 conversion: ${err.message}` })  
        }  
    })  
}  

// Helper function to extract like count from engagement panels (unchanged)
const extractLikeCount = (engagementPanels) => {
    try {
        if (!engagementPanels || !Array.isArray(engagementPanels)) return null;
        
        for (const panel of engagementPanels) {
            if (panel.engagementPanelSectionListRenderer) {
                const content = panel.engagementPanelSectionListRenderer.content;
                if (content && content.structuredDescriptionContentRenderer) {
                    const items = content.structuredDescriptionContentRenderer.items;
                    if (Array.isArray(items)) {
                        for (const item of items) {
                            if (item.videoDescriptionHeaderRenderer) {
                                const factoid = item.videoDescriptionHeaderRenderer.factoid;
                                if (factoid && factoid.factoidRenderer) {
                                    const text = factoid.factoidRenderer.value.simpleText;
                                    if (text && text.includes('like')) {
                                        return parseInt(text.replace(/[^\d]/g, '')) || null;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.log('Error extracting like count:', error.message);
    }
    return null;
}

// Additional helper functions for better debugging
const testYouTubeConnection = async () => {
    try {
        console.log('Testing YouTube connection...')
        const testVideo = await getYoutubeVideoInfo('test')
        console.log('YouTube connection test successful')
        return true
    } catch (error) {
        console.log('YouTube connection test failed:', error.message)
        return false
    }
}

// Enhanced thumbnail function with multiple fallbacks
// Enhanced thumbnail function with multiple fallbacks
const getYoutubeThumbnail = async (text, quality = 'maxresdefault') => {
    return new Promise(async (resolve, reject) => {
        try {
            let response = {}
            let video_id = ''
            
            // Check if the URL is valid
            const VALID_URL = ytdl.validateURL(text)
            if (VALID_URL) {
                video_id = ytdl.getVideoID(text)
            } else {
                try {
                    const videoSearch = await Youtube.searchOne(text, { 
                        requestOptions: {
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                            }
                        }
                    })
                    video_id = videoSearch.id
                } catch (searchError) {
                    response.error = 'Video not found for thumbnail extraction.'
                    return reject(response)
                }
            }
            
            // Try multiple thumbnail qualities in order of preference
            const qualities = ['maxresdefault', 'hqdefault', 'mqdefault', 'default']
            let startIndex = qualities.indexOf(quality)
            if (startIndex === -1) startIndex = 0
            
            for (let i = startIndex; i < qualities.length; i++) {
                const currentQuality = qualities[i]
                const thumbnailUrl = `https://img.youtube.com/vi/${video_id}/${currentQuality}.jpg`
                
                try {
                    const checkResponse = await axios.head(thumbnailUrl, { 
                        timeout: 8000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                        }
                    });
                    
                    if (checkResponse.status === 200) {
                        response.result = {
                            videoId: video_id,
                            thumbnailUrl: thumbnailUrl,
                            quality: currentQuality
                        }
                        return resolve(response)
                    }
                } catch (error) {
                    console.log(`Thumbnail check failed for quality ${currentQuality}:`, error.message)
                    continue
                }
            }
            
            // If all qualities failed, return error
            response.error = 'No thumbnail available for this video'
            reject(response)
            
        } catch (err) {
            console.log(`API getYoutubeThumbnail - ${err.message}`)
            reject({ error: 'Error extracting thumbnail.' })
        }
    });
}

module.exports = { 
    getYoutubeVideoInfo, 
    getYoutubeMP4, 
    getYoutubeMP3, 
    getRelatedVideos, 
    getYoutubeThumbnail,
    testYouTubeConnection
}
