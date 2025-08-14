const fs = require('fs-extra')  
const { getTemporaryPath, formatSeconds } = require('./util.js')  
const { convertMp4ToMp3 } = require('./video.js')  
const Youtube = require('youtube-sr').default  
const ytdl = require('@distube/ytdl-core')  
const axios = require('axios')  

const yt_agent = ytdl.createAgent([{ name: 'cookie1', value: 'GPS=1; YSC=CkypMSpfgiI; VISITOR_INFO1_LIVE=4nF8vxPW1gU; VISITOR_PRIVACY_METADATA=CgJCUhIEGgAgZA%3D%3D; PREF=f6=40000000&tz=America.Sao_Paulo; SID=g.a000lggw9yBHfdDri-OHg79Bkk2t6L2X7cbwK7jv8BYZZa4Q1hDbH4SZC5IHPqi_QBmSiigPHAACgYKAYgSARASFQHGX2Mi3N21zLYOMAku61_CaeccrxoVAUF8yKo3X97N4REFyHP4du4RIo1b0076; __Secure-1PSIDTS=sidts-CjIB3EgAEmNr03Tidygwml9aTrgDf0woi14K6jndMv5Ox5uI22tYDMNEYiaAoEF0KjGYgRAA; __Secure-3PSIDTS=sidts-CjIB3EgAEmNr03Tidygwml9aTrgDf0woi14K6jndMv5Ox5uI22tYDMNEYiaAoEF0KjGYgRAA; __Secure-1PSID=g.a000lggw9yBHfdDri-OHg79Bkk2t6L2X7cbwK7jv8BYZZa4Q1hDbYpnHl6jq9y45aoBaqMd96QACgYKAR4SARASFQHGX2MiqFuOgRtuIS_FKmulaCrckxoVAUF8yKpX5r8ISh5S5eQ4eofBuyCg0076; __Secure-3PSID=g.a000lggw9yBHfdDri-OHg79Bkk2t6L2X7cbwK7jv8BYZZa4Q1hDb_8Q3teG8nn23ceeF8jiOvwACgYKAY0SARASFQHGX2MiwBtnenbu4CRMpjQza-asfhoVAUF8yKoFXx_Zxl4MvxGnWSSsnv1z0076; HSID=AWgIQn3iifuaU_eRW; SSID=AR8Jlj2XTnPAmL5kf; APISID=l6PTqM9Dy8G_2E6P/A-sAusHOyG1pQ3T75; SAPISID=OSmwE6VjdFmB1u5-/A2N-7DiRQUreUSpgT; __Secure-1PAPISID=OSmwE6VjdFmB1u5-/A2N-7DiRQUreUSpgT; __Secure-3PAPISID=OSmwE6VjdFmB1u5-/A2N-7DiRQUreUSpgT; LOGIN_INFO=AFmmF2swRQIgShGx2tfQkQV4F8lyKnh4mwj54yTOPJqEdI44sDTtsrwCIQD870Le1gTMDFpz7rRHS6Fk0HzraG_SxHw_PdyLjUDXxg:QUQ3MjNmeVpqbVhSQlNCMnFFZXBKQkhCTHJxY1NXOVlYcG50SHNNOGxGZGZ3Z2ZobWwyOW95WGJ2LVplelNaZ0RfbGU3Tm1uYktDdHBnVm9fd3N3T0NncVpTN0ZaNlRoTTVETDJHSjV6QkxUWmdYWGx0eVFYeEFqa0gxUGdBYUJKbG5oQ2pBd3RBb0ROWXBwcFQwYkpBRktEQXlWbmZIbHJB; SIDCC=AKEyXzXkXTftuhPOtObUSCLHxp1byOAtlesMkptSGp8hyE3d97Dvy2UHd4-2ePWBpzUbQhV6; __Secure-1PSIDCC=AKEyXzXlrhkCIONPS4jCvhmtFb8nAKr8fEFCCFEFqN8BKyrw8tKHFh3-r8EWjrqjAKH9Z9fq0A; __Secure-3PSIDCC=AKEyXzWLIbNbh8dxdyKhTafkyKIbEBwVKGR4lNRhhYX5u_v1k4vBnu4eAS9lgpP-JK2PgiSDJw'}])  

// Function to get YouTube video information (Enhanced)
const getYoutubeVideoInfo = async (text) => {  
    return new Promise(async (resolve, reject) => {  
        try {  
            let response = {}, video_id = ''  
              
            // Check if the URL is valid  
            const VALID_URL = ytdl.validateURL(text)  
            if (VALID_URL) {  
                video_id = ytdl.getVideoID(text)  
            } else {  
                await Youtube.searchOne(text).then((videoSearch) => {  
                    video_id = videoSearch.id  
                }).catch(() => {  
                    response.error = 'There was an error retrieving the video information.'  
                    return reject(response)  
                })  
            }  

            // Get video information  
            ytdl.getInfo(video_id, {  
                playerClients: ["WEB", "WEB_EMBEDDED", "ANDROID", "IOS"],  
                agent: yt_agent  
            }).then(videoInfo => {  
                const formats = ytdl.filterFormats(videoInfo.formats, "videoandaudio")  
                const format = ytdl.chooseFormat(formats, { quality: 'highest' })  
                
                // Extract thumbnails
                const thumbnails = videoInfo.player_response.videoDetails.thumbnail?.thumbnails || []
                const highestThumbnail = thumbnails.reduce((prev, current) => 
                    (prev.width * prev.height > current.width * current.height) ? prev : current
                ) || null

                response.result = {  
                    videoId: videoInfo.player_response.videoDetails.videoId,  
                    title: videoInfo.player_response.videoDetails.title,  
                    shortDescription: videoInfo.player_response.videoDetails.shortDescription,  
                    lengthSeconds: videoInfo.player_response.videoDetails.lengthSeconds,  
                    keywords: videoInfo.player_response.videoDetails.keywords,  
                    channelId: videoInfo.player_response.videoDetails.channelId,
                    author: videoInfo.player_response.videoDetails.author,
                    viewCount: parseInt(videoInfo.player_response.videoDetails.viewCount) || 0,
                    likeCount: videoInfo.player_response.engagementPanels ? 
                        extractLikeCount(videoInfo.player_response.engagementPanels) : null,
                    isOwnerViewing: videoInfo.player_response.videoDetails.isOwnerViewing,  
                    isCrawlable: videoInfo.player_response.videoDetails.isCrawlable,  
                    durationFormatted: formatSeconds(parseInt(videoInfo.player_response.videoDetails.lengthSeconds)),  
                    thumbnail: highestThumbnail ? highestThumbnail.url : `https://img.youtube.com/vi/${video_id}/maxresdefault.jpg`,
                    thumbnails: thumbnails,
                    publishDate: videoInfo.player_response.microformat?.playerMicroformatRenderer?.publishDate || null,
                    uploadDate: videoInfo.player_response.microformat?.playerMicroformatRenderer?.uploadDate || null,
                    category: videoInfo.player_response.microformat?.playerMicroformatRenderer?.category || null,
                    format  
                }  
                resolve(response)  
            }).catch((err) => {  
                if (err.message === "Status code: 410") {  
                    response.error = 'The video seems to have age restrictions or requires login to watch.'  
                } else {  
                    response.error = 'There was an error retrieving the video information.'  
                }  
                reject(response)  
            })  
        } catch (err) {  
            console.log(`API getYoutubeVideoInfo - ${err.message}`)  
            reject({ error: 'There was an error on the YouTube search server.' })  
        }  
    })  
}  

// Helper function to extract like count from engagement panels
const extractLikeCount = (engagementPanels) => {
    try {
        for (const panel of engagementPanels) {
            if (panel.engagementPanelSectionListRenderer) {
                const content = panel.engagementPanelSectionListRenderer.content;
                if (content && content.structuredDescriptionContentRenderer) {
                    const items = content.structuredDescriptionContentRenderer.items;
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
    } catch (error) {
        console.log('Error extracting like count:', error.message);
    }
    return null;
}

// Function to get YouTube trending videos
const getYoutubeTrending = async (category = 'music', region = 'US') => {
    return new Promise(async (resolve, reject) => {
        try {
            let response = {}
            
            // Use youtube-sr to get trending videos
            await Youtube.getTrending(region).then(videos => {
                // Filter by category if specified
                let filteredVideos = videos;
                if (category.toLowerCase() === 'music') {
                    filteredVideos = videos.filter(video => 
                        video.type === 'video' && (
                            (video.channel && video.channel.name && 
                             (video.channel.name.toLowerCase().includes('music') || 
                              video.channel.name.toLowerCase().includes('records') ||
                              video.channel.name.toLowerCase().includes('entertainment'))) ||
                            (video.title && (
                              video.title.toLowerCase().includes('music') ||
                              video.title.toLowerCase().includes('song') ||
                              video.title.toLowerCase().includes('official') ||
                              video.title.toLowerCase().includes('mv') ||
                              video.title.toLowerCase().includes('audio')
                            ))
                        )
                    );
                }

                const trendingList = filteredVideos.slice(0, 20).map(video => ({
                    videoId: video.id,
                    title: video.title,
                    channelTitle: video.channel ? video.channel.name : 'Unknown',
                    channelId: video.channel ? video.channel.id : null,
                    viewCount: video.views || 0,
                    duration: video.duration ? formatSeconds(video.duration) : null,
                    thumbnail: video.thumbnail ? video.thumbnail.url : `https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`,
                    publishedTimeText: video.uploadedAt || null,
                    description: video.description || ''
                }));

                response.result = trendingList;
                resolve(response);
            }).catch(error => {
                response.error = 'Failed to fetch trending videos';
                reject(response);
            });

        } catch (err) {
            console.log(`API getYoutubeTrending - ${err.message}`);
            reject({ error: 'There was an error fetching trending videos.' });
        }
    });
}

// Function to get related videos
const getRelatedVideos = async (videoId) => {
    return new Promise(async (resolve, reject) => {
        try {
            let response = {}
            
            // Get video info first to extract related videos
            ytdl.getInfo(videoId, {
                playerClients: ["WEB", "WEB_EMBEDDED", "ANDROID", "IOS"],
                agent: yt_agent
            }).then(async (videoInfo) => {
                // Try to get related videos from search based on video title/keywords
                const title = videoInfo.player_response.videoDetails.title;
                const keywords = videoInfo.player_response.videoDetails.keywords || [];
                
                // Create search query from title and keywords
                let searchQuery = title;
                if (keywords.length > 0) {
                    searchQuery += ' ' + keywords.slice(0, 3).join(' ');
                }

                await Youtube.search(searchQuery, { limit: 10, type: 'video' }).then(searchResults => {
                    // Filter out the original video and format results
                    const relatedVideos = searchResults
                        .filter(video => video.id !== videoId)
                        .slice(0, 8)
                        .map(video => ({
                            videoId: video.id,
                            title: video.title,
                            channelTitle: video.channel ? video.channel.name : 'Unknown',
                            channelId: video.channel ? video.channel.id : null,
                            viewCount: video.views || 0,
                            duration: video.duration ? formatSeconds(video.duration) : null,
                            thumbnail: video.thumbnail ? video.thumbnail.url : `https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`,
                            publishedTimeText: video.uploadedAt || null,
                            description: video.description || ''
                        }));

                    response.result = relatedVideos;
                    resolve(response);
                }).catch(error => {
                    response.error = 'Failed to fetch related videos';
                    reject(response);
                });

            }).catch(error => {
                response.error = 'Failed to get video information for related videos';
                reject(response);
            });

        } catch (err) {
            console.log(`API getRelatedVideos - ${err.message}`);
            reject({ error: 'There was an error fetching related videos.' });
        }
    });
}



// Helper function to parse artist and song from query
const parseArtistAndSong = (query) => {
    // Common separators: -, by, ft, feat, featuring
    const separators = [' - ', ' by ', ' ft ', ' feat ', ' featuring '];
    let artist = '', song = '';
    
    for (const sep of separators) {
        if (query.toLowerCase().includes(sep)) {
            const parts = query.split(new RegExp(sep, 'i'));
            if (parts.length >= 2) {
                artist = parts[0].trim();
                song = parts[1].trim();
                break;
            }
        }
    }
    
    // If no separator found, try to guess based on common patterns
    if (!artist && !song) {
        const words = query.split(' ');
        if (words.length >= 2) {
            // Assume first part is artist, rest is song
            artist = words[0];
            song = words.slice(1).join(' ');
        } else {
            song = query;
        }
    }
    
    return { artist, song };
}



// Function to get YouTube video in MP4 format
const getYoutubeMP4 = async (text, progressCallback) => {  
    return new Promise(async (resolve, reject) => {  
        try {  
            let response = {}  
            let videoOutput = getTemporaryPath('mp4')  
            let { result: videoInfo } = await getYoutubeVideoInfo(text)  
              
            if (!videoInfo) {  
                return reject({ error: "Failed to retrieve video information." })  
            }  

            let videoStream = ytdl(videoInfo.videoId, { format: videoInfo.format, agent: yt_agent })  
            let totalSize = 0;
            let downloadedSize = 0;
            
            // Track download progress
            videoStream.on('response', (response) => {
                totalSize = parseInt(response.headers['content-length']) || 0;
            });
            
            videoStream.on('data', (chunk) => {
                downloadedSize += chunk.length;
                if (totalSize > 0 && progressCallback) {
                    const progress = Math.round((downloadedSize / totalSize) * 100);
                    progressCallback(progress);
                }
            });
            
            videoStream.pipe(fs.createWriteStream(videoOutput))  
              
            videoStream.on("end", () => {  
                let videoBuffer = fs.readFileSync(videoOutput)  
                fs.unlinkSync(videoOutput)  
                response.result = videoBuffer  
                resolve(response)  
            }).on('error', (error) => {  
                console.log('Video download error:', error.message);
                response.error = "Server error while retrieving the YouTube video."  
                reject(response)  
            })  
        } catch (err) {  
            console.log(`API getYoutubeMP4 - ${err.message}`)  
            reject({ error: "Server error while retrieving the YouTube video." })  
        }  
    })  
}  

// Function to get YouTube audio in MP3 format
const getYoutubeMP3 = async (text, progressCallback) => {  
    return new Promise(async (resolve, reject) => {  
        try {  
            let response = {}  
            let { result: videoBuffer } = await getYoutubeMP4(text, progressCallback)  
            let { result: audioBuffer } = await convertMp4ToMp3(videoBuffer)  
            response.result = audioBuffer  
            resolve(response)  
        } catch (err) {  
            console.log(`API getYoutubeMP3 - ${err.message}`)  
            reject({ error: "Error during conversion to obtain YouTube MP3." })  
        }  
    })  
}  

// Function to extract high-quality thumbnail
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
                await Youtube.searchOne(text).then((videoSearch) => {
                    video_id = videoSearch.id
                }).catch(() => {
                    response.error = 'Video not found for thumbnail extraction.'
                    return reject(response)
                })
            }
            
            // Available qualities: maxresdefault, sddefault, hqdefault, mqdefault, default
            const thumbnailUrl = `https://img.youtube.com/vi/${video_id}/${quality}.jpg`
            
            // Verify thumbnail exists
            try {
                const checkResponse = await axios.head(thumbnailUrl, { timeout: 5000 });
                if (checkResponse.status === 200) {
                    response.result = {
                        videoId: video_id,
                        thumbnailUrl: thumbnailUrl,
                        quality: quality
                    }
                    resolve(response)
                } else {
                    throw new Error('Thumbnail not available')
                }
            } catch (error) {
                // Try fallback quality
                if (quality === 'maxresdefault') {
                    return getYoutubeThumbnail(text, 'hqdefault').then(resolve).catch(reject);
                } else {
                    response.error = 'Thumbnail not available for this video'
                    reject(response)
                }
            }
            
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
    getYoutubeTrending, 
    getRelatedVideos, 
    getYoutubeThumbnail 
}
