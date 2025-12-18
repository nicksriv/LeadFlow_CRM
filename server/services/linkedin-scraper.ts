import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, Page } from "puppeteer";
import { linkedInAuthService } from "./linkedin-auth.js";
import { profileHistoryService } from "./profile-history.js";

puppeteer.use(StealthPlugin());

// Fallback email for development/testing when no email is found
const FALLBACK_EMAIL = "technology@codescribed.com";

interface SearchFilters {
    jobTitle?: string;
    industry?: string;
    keywords?: string; // Location
    company?: string;
}

interface SearchResponse {
    results: ProfileResult[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        hasMore: boolean;
    };
    message?: string;
}

interface ProfileResult {
    id: string;
    name: string;
    headline: string;
    location: string;
    summary?: string;
    currentCompany?: string;
    experience?: string;
    url: string;
    activity?: string;
    avatar?: string;
    profileImageUrl?: string;  // Add this to fix TypeScript error
    email?: string;
    // Detailed fields from scraping
    about?: string;
    skills?: string[];
    posts?: string[];
    education?: string;
    experiences?: any[];
    interests?: string[];
    activityIndicators?: {
        hasRecentPosts: boolean;
        postCount: number;
        skillCount: number;
        interestCount: number;
    };
}

// LinkedIn Location Mapping (geoUrn codes for location filtering)
const LINKEDIN_LOCATIONS: Record<string, string> = {
    // Countries
    'us': '103644278',
    'usa': '103644278',
    'united states': '103644278',
    'india': '102713980',
    'uk': '101165590',
    'united kingdom': '101165590',
    'canada': '101174742',
    'australia': '101452733',
    'singapore': '102454443',
    'uae': '104305776',
    'dubai': '104305776',

    // Major Indian Cities
    'mumbai': '105214831',
    'bangalore': '105214077',
    'bengaluru': '105214077',
    'delhi': '106156739',
    'new delhi': '106156739',
    'hyderabad': '105193085',
    'chennai': '102713982',
    'pune': '106057199',
    'kolkata': '105193567',

    // Major US Cities
    'new york': '102571732',
    'san francisco': '102277331',
    'los angeles': '102448103',
    'chicago': '103112676',
    'boston': '100293800',
    'seattle': '104116018',
    'austin': '100975049',

    // Other Major Cities
    'london': '102257491',
    'toronto': '100025096',
    'sydney': '104769905',
};

export class LinkedInScraperService {
    private browser: Browser | null = null;
    private page: Page | null = null;

    /**
     * Perform LinkedIn people search using authenticated session
     */
    async searchPeople(userId: string, filters: SearchFilters): Promise<SearchResponse> {
        try {
            // Get LinkedIn session cookies for this specific user
            const cookies = await linkedInAuthService.getCookies(userId);
            if (!cookies || cookies.length === 0) {
                throw new Error("Not authenticated. Please connect your LinkedIn account first.");
            }

            console.log(`[LinkedIn Scraper] Starting search with authenticated session (Optimized v2)...`);

            // Launch browser - make it visible for debugging
            // Launch browser - make it visible for debugging
            this.browser = await puppeteer.launch({
                headless: true, // Background mode
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-blink-features=AutomationControlled',
                    '--start-maximized',
                ],
            });

            this.page = await this.browser.newPage();

            // Set viewport
            await this.page.setViewport({ width: 1366, height: 768 });

            // Set cookies
            await this.page.setCookie(...cookies);

            // Set realistic user agent
            await this.page.setUserAgent(
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            );

            // Build search URL
            const searchUrl = this.buildSearchUrl(filters);
            console.log(`[LinkedIn Scraper] Navigating to: ${searchUrl}`);

            // Navigate to search page with relaxed conditions
            try {
                await this.page.goto(searchUrl, {
                    waitUntil: 'domcontentloaded', // Changed from networkidle2 to be more lenient
                    timeout: 60000, // Increased timeout to 60 seconds
                });
            } catch (navError: any) {
                console.log(`[LinkedIn Scraper] Navigation warning: ${navError.message}`);
                // Continue anyway - page might have partially loaded
            }

            // Wait for page to settle
            console.log('[LinkedIn Scraper] Waiting for content to load...');
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Check if we're on the right page
            const pageUrl = this.page.url();
            console.log(`[LinkedIn Scraper] Current URL: ${pageUrl}`);

            // Save HTML for debugging
            try {
                const html = await this.page.content();
                const fs = await import('fs');
                await fs.promises.writeFile('/tmp/linkedin-search-results.html', html);
                console.log('[LinkedIn Scraper] Search results HTML saved to /tmp/linkedin-search-results.html');
            } catch (err) {
                console.error('[LinkedIn Scraper] Failed to save debug HTML:', err);
            }

            // Extract search results
            const results = await this.page.evaluate(() => {
                const data: any[] = [];

                // Try to find results using the new "data-view-name" attribute
                const resultNodes = document.querySelectorAll('div[data-view-name="people-search-result"]');

                if (resultNodes.length > 0) {
                    console.log(`[LinkedIn Scraper Debug] Found ${resultNodes.length} results using data-view-name`);

                    resultNodes.forEach((node) => {
                        try {
                            // Name and URL
                            const titleLink = node.querySelector('a[data-view-name="search-result-lockup-title"]');
                            if (!titleLink) return;

                            const profileUrl = (titleLink as HTMLAnchorElement).href.split('?')[0];
                            const name = (titleLink as HTMLElement).innerText.trim();

                            // Image
                            const img = node.querySelector('img');
                            const avatar = img ? img.src : null;

                            // The text content is usually in a div that contains the title link.
                            // We can find the container of the title link and look for sibling p tags.
                            // The structure observed is:
                            // div > p (Name)
                            // div > p (Headline)
                            // div > p (Location)
                            // div > p (Current/Summary/etc)

                            let headline = '';
                            let location = '';
                            let summary = '';
                            let currentCompany = '';

                            // Find the parent div of the title paragraph
                            const titleParagraph = titleLink.closest('p');
                            if (titleParagraph && titleParagraph.parentElement) {
                                const paragraphs = Array.from(titleParagraph.parentElement.querySelectorAll('p'));

                                // Index 0 is Name (titleParagraph)
                                // Index 1 is usually Headline
                                if (paragraphs.length > 1) {
                                    headline = paragraphs[1].innerText.trim();
                                }

                                // Index 2 is usually Location
                                if (paragraphs.length > 2) {
                                    location = paragraphs[2].innerText.trim();
                                }

                                // Subsequent paragraphs might be Summary or Current
                                for (let i = 3; i < paragraphs.length; i++) {
                                    const text = paragraphs[i].innerText.trim();
                                    if (text.startsWith('Summary:')) {
                                        summary = text.replace('Summary:', '').trim();
                                    } else if (text.startsWith('Current:')) {
                                        currentCompany = text.replace('Current:', '').trim();
                                    } else if (!summary && text.length > 20) {
                                        // Fallback for summary if it doesn't have prefix but looks like one
                                        summary = text;
                                    }
                                }
                            }

                            // Extract ID from URL
                            // URL format: https://www.linkedin.com/in/username/ or https://www.linkedin.com/in/username
                            let id = '';
                            const urlParts = profileUrl.split('/in/');
                            if (urlParts.length > 1) {
                                id = urlParts[1].split('/')[0];
                            }

                            data.push({
                                id,
                                name,
                                url: profileUrl, // Frontend expects 'url'
                                avatar,
                                headline,
                                location,
                                summary,
                                currentCompany,
                                activity: 'Active recently' // Placeholder as we can't easily get this from search results
                            });

                        } catch (err) {
                            console.error('[LinkedIn Scraper Debug] Error extracting individual result:', err);
                        }
                    });
                } else {
                    // Fallback to old logic (entity-result) just in case
                    console.log('[LinkedIn Scraper Debug] No data-view-name results found, trying legacy selectors');
                    const profileLinks = document.querySelectorAll('a[href*="/in/"]');
                    // ... (Legacy logic omitted for brevity, assuming new logic works based on HTML inspection)
                    // Actually, let's keep a simplified version of the old logic as a backup
                    const containers = document.querySelectorAll('.entity-result__item, .reusable-search__result-container');
                    containers.forEach(container => {
                        try {
                            const titleLink = container.querySelector('.entity-result__title-text a') as HTMLAnchorElement;
                            if (!titleLink) return;

                            const profileUrl = titleLink.href.split('?')[0];
                            const name = titleLink.innerText.trim().split('\n')[0];
                            const img = container.querySelector('img');
                            const avatar = img ? img.src : null;
                            const headline = (container.querySelector('.entity-result__primary-subtitle') as HTMLElement)?.innerText?.trim() || '';
                            const location = (container.querySelector('.entity-result__secondary-subtitle') as HTMLElement)?.innerText?.trim() || '';
                            const summary = (container.querySelector('.entity-result__summary') as HTMLElement)?.innerText?.trim() || '';

                            let id = '';
                            const urlParts = profileUrl.split('/in/');
                            if (urlParts.length > 1) {
                                id = urlParts[1].split('/')[0];
                            }

                            data.push({
                                id,
                                name,
                                url: profileUrl,
                                avatar,
                                headline,
                                location,
                                summary,
                                activity: 'Active recently'
                            });
                        } catch (e) { }
                    });
                }

                return data;
            });

            console.log(`[LinkedIn Scraper] Found ${results.length} results on page 1`);

            // Get viewed profile IDs for deduplication
            console.log(`[LinkedIn Scraper] Fetching viewed profile history...`);
            const viewedProfileIds = await profileHistoryService.getViewedProfileIds(userId);
            console.log(`[LinkedIn Scraper] User has viewed ${viewedProfileIds.length} profiles previously`);

            // Filter page 1 results for duplicates
            let uniqueProfiles = results.filter(profile =>
                !profileHistoryService.hasViewedProfile(profile.id, viewedProfileIds)
            );
            console.log(`[LinkedIn Scraper] Page 1: ${results.length} total, ${uniqueProfiles.length} unique`);

            // RECURSIVE PAGINATION: Keep fetching until we have 30 unique profiles
            const targetUniqueCount = 30;
            const maxPages = 20; // Safety limit to prevent infinite loops
            let currentPageNum = 1;
            let allFetchedResults = [...results]; // Track all fetched for logging

            while (uniqueProfiles.length < targetUniqueCount && currentPageNum < maxPages && this.page) {
                try {
                    currentPageNum++;
                    console.log(`[LinkedIn Scraper] Need ${targetUniqueCount - uniqueProfiles.length} more unique profiles, fetching page ${currentPageNum}...`);

                    // Build URL for next page
                    const nextPageUrl = this.buildSearchUrl(filters) + `&page=${currentPageNum}`;

                    // Navigate to the page
                    await this.page.goto(nextPageUrl, {
                        waitUntil: 'domcontentloaded',
                        timeout: 60000
                    });

                    // Wait for content to load
                    await new Promise(resolve => setTimeout(resolve, 8000));

                    // Extract results from this page
                    const pageResults = await this.page.evaluate(() => {
                        const data: any[] = [];
                        const resultNodes = document.querySelectorAll('div[data-view-name="people-search-result"]');

                        resultNodes.forEach((node) => {
                            try {
                                const titleLink = node.querySelector('a[data-view-name="search-result-lockup-title"]');
                                if (!titleLink) return;

                                const profileUrl = (titleLink as HTMLAnchorElement).href.split('?')[0];
                                const name = (titleLink as HTMLElement).innerText.trim();
                                const img = node.querySelector('img');
                                const avatar = img ? img.src : null;

                                let headline = '';
                                let location = '';
                                let summary = '';
                                let currentCompany = '';

                                const titleParagraph = titleLink.closest('p');
                                if (titleParagraph && titleParagraph.parentElement) {
                                    const paragraphs = Array.from(titleParagraph.parentElement.querySelectorAll('p'));

                                    if (paragraphs.length > 1) {
                                        headline = paragraphs[1].innerText.trim();
                                    }

                                    if (paragraphs.length > 2) {
                                        location = paragraphs[2].innerText.trim();
                                    }

                                    for (let i = 3; i < paragraphs.length; i++) {
                                        const text = paragraphs[i].innerText.trim();
                                        if (text.startsWith('Summary:')) {
                                            summary = text.replace('Summary:', '').trim();
                                        } else if (text.startsWith('Current:')) {
                                            currentCompany = text.replace('Current:', '').trim();
                                        } else if (!summary && text.length > 20) {
                                            summary = text;
                                        }
                                    }
                                }

                                let profileId = '';
                                const urlParts = profileUrl.split('/in/');
                                if (urlParts.length > 1) {
                                    profileId = urlParts[1].split('/')[0];
                                }

                                if (profileId) {
                                    data.push({
                                        id: profileId,
                                        name,
                                        url: profileUrl,
                                        avatar,
                                        headline,
                                        location,
                                        summary,
                                        currentCompany,
                                        activity: 'Active recently'
                                    });
                                }
                            } catch (err) {
                                console.error('[LinkedIn Scraper] Error extracting result:', err);
                            }
                        });

                        return data;
                    });

                    console.log(`[LinkedIn Scraper] Page ${currentPageNum}: fetched ${pageResults.length} results`);
                    allFetchedResults = [...allFetchedResults, ...pageResults];

                    // If we got 0 results, LinkedIn has no more pages
                    if (pageResults.length === 0) {
                        console.log(`[LinkedIn Scraper] No results on page ${currentPageNum}, LinkedIn exhausted`);
                        break;
                    }

                    // Filter this page's results for uniqueness
                    const uniqueFromThisPage = pageResults.filter(profile =>
                        !profileHistoryService.hasViewedProfile(profile.id, viewedProfileIds) &&
                        !uniqueProfiles.some(existing => existing.id === profile.id) // Also check against already collected unique
                    );

                    uniqueProfiles = [...uniqueProfiles, ...uniqueFromThisPage];
                    console.log(`[LinkedIn Scraper] Page ${currentPageNum}: ${uniqueFromThisPage.length} unique, total unique: ${uniqueProfiles.length}/${targetUniqueCount}`);

                } catch (paginationError: any) {
                    console.error(`[LinkedIn Scraper] Error on page ${currentPageNum}:`, paginationError.message);
                    break;
                }
            }

            const totalFetched = allFetchedResults.length;
            const duplicatesFiltered = totalFetched - uniqueProfiles.length;
            console.log(`[LinkedIn Scraper] Summary: Fetched ${totalFetched} profiles across ${currentPageNum} pages, ${uniqueProfiles.length} unique, ${duplicatesFiltered} duplicates filtered`);

            // Save new profiles to history
            if (uniqueProfiles.length > 0) {
                await profileHistoryService.saveBatch(userId, uniqueProfiles, filters);
                console.log(`[LinkedIn Scraper] Saved ${uniqueProfiles.length} profiles to history`);
            }

            // Keep browser open for a moment
            await new Promise(resolve => setTimeout(resolve, 2000));

            await this.cleanup();

            // Return SearchResponse format with deduplicated results
            return {
                results: uniqueProfiles,
                pagination: {
                    page: 1,
                    limit: uniqueProfiles.length,
                    total: uniqueProfiles.length,
                    hasMore: currentPageNum >= maxPages && uniqueProfiles.length > 0
                },
                message: uniqueProfiles.length === 0 && totalFetched > 0
                    ? `All ${totalFetched} profiles have been viewed previously. Try different search criteria.`
                    : uniqueProfiles.length === 0
                        ? "No profiles found. Try broader search terms or different location."
                        : duplicatesFiltered > 0
                            ? `Found ${uniqueProfiles.length} new profile(s). ${duplicatesFiltered} duplicate(s) filtered.`
                            : undefined
            };

        } catch (error: any) {
            console.error("[LinkedIn Scraper] Error:", error);
            await this.cleanup();
            throw error;
        }
    }

    /**
     * Build LinkedIn search URL from filters with location support
     */
    private buildSearchUrl(filters: SearchFilters): string {
        const baseUrl = 'https://www.linkedin.com/search/results/people/';
        const params: string[] = [];

        // Build search keywords (Title + Industry + Company)
        const keywords: string[] = [];

        if (filters.jobTitle) {
            keywords.push(filters.jobTitle);
        }

        if (filters.industry) {
            keywords.push(filters.industry);
        }

        if (filters.company) {
            keywords.push(filters.company);
        }

        // Join keywords with spaces
        const finalKeywords = keywords.join(' ').trim();

        if (finalKeywords) {
            params.push(`keywords=${encodeURIComponent(finalKeywords)}`);
        }

        // Handle LOCATION using geoUrn for accurate filtering
        if (filters.keywords) {
            const locationKey = filters.keywords.toLowerCase().trim();
            const geoUrn = LINKEDIN_LOCATIONS[locationKey];

            if (geoUrn) {
                // Use LinkedIn's native location filter with geoUrn
                params.push(`geoUrn=%5B%22${geoUrn}%22%5D`); // URL-encoded ["geoUrnValue"]
                console.log(`[LinkedIn Scraper] Using geoUrn for location "${filters.keywords}": ${geoUrn}`);
            } else {
                // Fallback: add location to keywords if not in mapping
                console.log(`[LinkedIn Scraper] Location "${filters.keywords}" not in mapping, adding to keywords`);
                if (finalKeywords) {
                    // Update the keywords param to include location
                    const updatedKeywords = `${finalKeywords} ${filters.keywords}`;
                    params[0] = `keywords=${encodeURIComponent(updatedKeywords)}`;
                } else {
                    params.push(`keywords=${encodeURIComponent(filters.keywords)}`);
                }
            }
        }

        const queryString = params.length > 0 ? `?${params.join('&')}` : '';
        const fullUrl = baseUrl + queryString;
        console.log(`[LinkedIn Scraper] Search URL: ${fullUrl}`);
        return fullUrl;
    }

    /**
   * Extract profile results from search page
   */
    private async extractSearchResults(): Promise<ProfileResult[]> {
        if (!this.page) return [];

        try {
            const pageTitle = await this.page.title();
            console.log(`[LinkedIn Scraper] Page title: ${pageTitle} `);

            // Give the page plenty of time to fully render
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Extract profile data using a more flexible approach
            const profiles = await this.page.evaluate(() => {
                const results: any[] = [];

                // Find all links that go to LinkedIn profiles
                const profileLinks = document.querySelectorAll('a[href*="/in/"]');

                console.log(`[LinkedIn Scraper Debug] Found ${profileLinks.length} profile links`);

                // Debug: Log the first container's HTML to see structure
                if (profileLinks.length > 0) {
                    let debugContainer: any = profileLinks[0];
                    for (let i = 0; i < 5; i++) {
                        if (debugContainer.parentElement) debugContainer = debugContainer.parentElement;
                    }
                    // We can't log full HTML here easily, but we can check classes
                    // console.log('First result container classes:', debugContainer.className);
                }

                const processedUrls = new Set();

                profileLinks.forEach((link) => {
                    const url = link.getAttribute('href') || '';

                    // Skip if we've already processed this URL
                    if (processedUrls.has(url)) return;

                    // Only process actual profile URLs (not search filters, etc.)
                    const profileMatch = url.match(/\/in\/([^\/\?]+)/);
                    if (!profileMatch) return;

                    const profileId = profileMatch[1];
                    processedUrls.add(url);

                    // Find the closest parent container (usually an li or div)
                    let container: any = link;
                    for (let i = 0; i < 10; i++) {
                        container = container.parentElement;
                        if (!container) break;

                        // Check if this looks like a result container
                        const tagName = container.tagName.toLowerCase();
                        if (tagName === 'li' || (tagName === 'div' && container.className.includes('result'))) {
                            break;
                        }
                    }

                    if (!container) return;

                    // Extract name - try to find the clickable name element
                    let name = '';
                    const nameEl = container.querySelector('span[aria-hidden="true"]');
                    if (nameEl) {
                        name = nameEl.textContent?.trim() || '';
                    }

                    // If we didn't find a name, try the link text itself
                    if (!name && link.textContent) {
                        const linkText = link.textContent.trim();
                        // LinkedIn names are usually just text, not too long
                        if (linkText.length > 2 && linkText.length < 100 && !linkText.includes('\n')) {
                            name = linkText;
                        }
                    }

                    // Skip if no valid name
                    if (!name || name.length < 2) return;

                    // Extract headline - look for subtitle or description
                    let headline = '';
                    const headlineEl = container.querySelector('.entity-result__primary-subtitle, [class*="subtitle"]');
                    if (headlineEl) {
                        headline = headlineEl.textContent?.trim() || '';
                    }

                    // Build full URL
                    const fullUrl = url.startsWith('http') ? url : `https://www.linkedin.com${url.split('?')[0]}`;

                    // Create avatar initials
                    const avatar = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

                    // Extract location - usually in the secondary subtitle
                    let location = '';
                    const locationEl = container.querySelector('.entity-result__secondary-subtitle');
                    if (locationEl) {
                        location = locationEl.textContent?.trim() || '';
                    } else {
                        // Fallback: try to find any text that looks like a location (usually after the name/headline)
                        const allText = container.innerText || '';
                        const lines = allText.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
                        // Heuristic: Location is often the 3rd or 4th line
                        if (lines.length > 2) {
                            // This is risky but better than nothing if selector fails
                            // We look for common location patterns or just take the line after headline
                        }
                    }

                    // Extract summary/snippet
                    let summary = '';
                    const summaryEl = container.querySelector('.entity-result__summary');
                    if (summaryEl) {
                        summary = summaryEl.textContent?.trim() || '';
                    }

                    // Attempt to extract current company from headline                    // Try to extract company from headline using multiple patterns
                    let currentCompany = '';
                    if (headline) {
                        // Try patterns: " at ", " AT ", " @ " (case-insensitive)
                        const companyMatch = headline.match(/(?:^|\s)(?:at|AT|@)\s+(.+?)$/i);
                        if (companyMatch && companyMatch[1]) {
                            currentCompany = companyMatch[1].trim();
                        } else {
                            // Fallback: Try to extract company after common titles
                            // E.g., "CEO Microsoft" or "VP Sales Goldman Sachs"
                            const titlePattern = /(?:CEO|CTO|CFO|COO|VP|Vice President|Director|Manager|Head|Lead|Senior|Engineer|Developer|Designer|Analyst)\s+(?:of\s+)?(.+?)$/i;
                            const titleMatch = headline.match(titlePattern);
                            if (titleMatch && titleMatch[1]) {
                                currentCompany = titleMatch[1].trim();
                            }
                        }
                    }

                    // Attempt to find experience/past roles in the summary or other list items
                    let experience = '';
                    const simpleTextEls = container.querySelectorAll('.entity-result__simple-insight-text, .entity-result__simple-insight');
                    simpleTextEls.forEach((el: any) => {
                        const text = el.textContent?.trim() || '';
                        if (text.includes('Past:')) {
                            experience = text;
                        } else if (text.includes('Current:') && !currentCompany) {
                            currentCompany = text.replace('Current:', '').trim();
                        } else if (!location && !text.includes('Shared') && !text.includes('Follows')) {
                            // Sometimes location is here if not in subtitle
                            // location = text; 
                        }
                    });

                    results.push({
                        id: profileId,
                        name,
                        headline,
                        location,
                        summary,
                        currentCompany,
                        experience,
                        url: fullUrl,
                        activity: headline || 'LinkedIn Profile',
                        avatar,
                    });
                });

                return results;
            });

            console.log(`[LinkedIn Scraper] Extracted ${profiles.length} profiles`);

            // If still no results, debug
            if (profiles.length === 0) {
                const bodyText = await this.page.evaluate(() => {
                    return document.body.textContent?.substring(0, 1000);
                });
                console.log(`[LinkedIn Scraper] Page body preview: ${bodyText}`);

                // Also check if we need to scroll or interact
                const hasResults = await this.page.evaluate(() => {
                    return document.querySelectorAll('a[href*="/in/"]').length;
                });

                console.log('[LinkedIn Scraper] Data extraction complete');
                console.log(`[LinkedIn Scraper] Total profile links found: ${hasResults}`);
            }

            return profiles;

        } catch (error) {
            console.error("[LinkedIn Scraper] Failed to extract results:", error);
            return [];
        }
    }

    /**
     * Scrape individual profile with comprehensive data for email generation
     */
    async scrapeProfile(userId: string, url: string, profileName?: string): Promise<ProfileResult> {
        try {
            // Use stored cookies for this specific user
            const cookies = await linkedInAuthService.getCookies(userId);
            if (!cookies || cookies.length === 0) {
                throw new Error("Not authenticated. Please connect your LinkedIn account first.");
            }

            console.log(`[LinkedIn Scraper] Scraping profile: ${url}${profileName ? ` (name from search: ${profileName})` : ''}`);

            console.log('[LinkedIn Scraper] Launching browser with enhanced stealth...');
            this.browser = await puppeteer.launch({
                headless: true,
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined, // Use default Chromium in container
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    // Enhanced anti-detection flags
                    '--disable-blink-features=AutomationControlled',
                    '--disable-features=IsolateOrigins,site-per-process,VizDisplayCompositor',
                    '--flag-switches-begin',
                    '--disable-site-isolation-trials',
                    '--flag-switches-end',
                    '--no-default-browser-check',
                    '--disable-infobars',
                    '--window-size=1920,1080',
                    '--start-maximized',
                    '--disable-popup-blocking',
                    '--ignore-certificate-errors',
                ],
            });

            this.page = await this.browser.newPage();

            // Override webdriver detection
            await this.page.evaluateOnNewDocument(() => {
                // Remove webdriver property
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined,
                });

                // Override permissions API
                const originalQuery = window.navigator.permissions.query;
                window.navigator.permissions.query = (parameters: any) => (
                    parameters.name === 'notifications' ?
                        Promise.resolve({ state: (Notification as any).permission } as PermissionStatus) :
                        originalQuery(parameters)
                );

                // Fix plugins to look more realistic
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [1, 2, 3, 4, 5],
                });

                // Override Chrome property
                (window as any).chrome = {
                    runtime: {},
                };
            });

            await this.page.setViewport({ width: 1920, height: 1080 });

            // Normalize cookies before setting
            console.log('[LinkedIn Scraper] Setting normalized cookies...');
            const normalizedCookies = cookies.map(cookie => ({
                ...cookie,
                domain: cookie.domain || '.linkedin.com',
                path: cookie.path || '/',
                httpOnly: cookie.httpOnly !== undefined ? cookie.httpOnly : true,
                secure: cookie.secure !== undefined ? cookie.secure : true,
                sameSite: (cookie.sameSite as any) || 'Lax',
            }));

            await this.page.setCookie(...normalizedCookies);

            await this.page.setUserAgent(
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            );

            // Navigate to profile with realistic wait
            console.log('[LinkedIn Scraper] Navigating to profile...');
            try {
                await this.page.goto(url, {
                    waitUntil: 'domcontentloaded', // Changed from networkidle2 - LinkedIn blocks network calls
                    timeout: 120000, // Increased to 120 seconds
                });
            } catch (navError: any) {
                console.error('[LinkedIn Scraper] Navigation failed:', navError.message);
                // Take screenshot of the blocked/error page
                await this.page.screenshot({ path: '/tmp/linkedin-navigation-error.png', fullPage: false });
                console.log('[LinkedIn Scraper] Error screenshot saved to /tmp/linkedin-navigation-error.png');

                // Check if we were redirected or blocked
                const currentUrl = this.page.url();
                console.log('[LinkedIn Scraper] Current URL after error:', currentUrl);

                // If LinkedIn redirected us away from the profile, throw a more helpful error
                if (!currentUrl.includes('/in/')) {
                    throw new Error('LinkedIn blocked access or session expired. Please reconnect your LinkedIn account.');
                }

                // If we're on the profile page but it timed out loading, continue anyway
                console.log('[LinkedIn Scraper] Continuing despite navigation timeout...');
            }

            console.log('[LinkedIn Scraper] Profile page loaded, mimicking human behavior...');

            // Random delay like a human (1-3 seconds)
            const humanDelay = Math.random() * 2000 + 1000;
            await new Promise(resolve => setTimeout(resolve, humanDelay));

            // Simulate human mouse movements
            await this.page.mouse.move(100, 100);
            await new Promise(resolve => setTimeout(resolve, 200));
            await this.page.mouse.move(400, 300);
            await new Promise(resolve => setTimeout(resolve, 300));
            await this.page.mouse.move(200, 500);

            // Wait for content to load
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Take screenshot for debugging
            await this.page.screenshot({ path: '/tmp/linkedin-profile-debug.png', fullPage: false });
            console.log('[LinkedIn Scraper] Screenshot saved to /tmp/linkedin-profile-debug.png');

            // Save HTML for inspection
            const html = await this.page.content();
            const fs = await import('fs');
            await fs.promises.writeFile('/tmp/linkedin-profile-debug.html', html);
            console.log('[LinkedIn Scraper] HTML saved to /tmp/linkedin-profile-debug.html');

            // Scroll down to load more content (posts, activity, skills)
            await this.page.evaluate(async () => {
                window.scrollTo(0, document.body.scrollHeight);
                await new Promise(resolve => setTimeout(resolve, 1000));
                window.scrollTo(0, 0); // Scroll back up
            });
            await new Promise(resolve => setTimeout(resolve, 2000));

            // ... (existing profile extraction logic)

            // Extract email from Contact Info
            let email = '';
            let profileImageUrl: string | null = null;
            try {
                console.log('[LinkedIn Scraper] Attempting to extract email from Contact Info...');

                // Click "Contact info" link
                let contactInfoLink = await this.page.$('#top-card-text-details-contact-info');
                if (!contactInfoLink) {
                    try {
                        contactInfoLink = await this.page.waitForSelector('xpath/.//a[contains(., "Contact info")]', { timeout: 2000 });
                    } catch (e) { }
                }

                if (contactInfoLink) {
                    await contactInfoLink.click();

                    // Wait for the modal content to load by looking for the word "Email"
                    console.log('[LinkedIn Scraper] Waiting for "Email" section to appear...');
                    try {
                        await this.page.waitForFunction(
                            () => document.body.innerText.includes('Email'),
                            { timeout: 5000 }
                        );
                    } catch (e) {
                        console.log('[LinkedIn Scraper] "Email" text not found in time, proceeding anyway...');
                    }

                    // Extract email - Scan the ENTIRE page text for an email pattern
                    email = await this.page.evaluate(() => {
                        const bodyText = document.body.innerText;
                        // Regex for email (simple version)
                        const emailMatch = bodyText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
                        if (emailMatch) {
                            return emailMatch[0];
                        }
                        return '';
                    });
                    console.log(`[LinkedIn Scraper] Extracted email: ${email}`);

                    // Close modal
                    await this.page.keyboard.press('Escape');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } else {
                    console.log('[LinkedIn Scraper] Contact info link not found');
                }
            } catch (err) {
                console.error('[LinkedIn Scraper] Failed to extract email:', err);
            }

            // Wait for the main profile content to load
            console.log('[LinkedIn Scraper] Waiting for profile main content to load...');
            try {
                // Wait for key profile elements to appear
                await this.page.waitForSelector('main', { timeout: 10000 });
                await new Promise(resolve => setTimeout(resolve, 2000)); // Additional wait for dynamic content
            } catch (e) {
                console.log('[LinkedIn Scraper] Main content wait timed out, continuing anyway...');
            }

            // Extract comprehensive profile data
            const profile = await this.page.evaluate(function () {
                // --- NAME ---
                let name = '';

                // Strategy 1: Look for specific profile name classes (most reliable)
                const nameSelectors = [
                    'h1.text-heading-xlarge',
                    'h1.inline.t-24.v-align-middle.break-words',
                    '.pv-text-details__left-panel h1',
                    'div.ph5 h1'
                ];

                for (const selector of nameSelectors) {
                    const el = document.querySelector(selector);
                    if (el && el.textContent) {
                        const text = el.textContent.trim();
                        // Skip if it's the privacy message
                        if (text && !text.includes('privacy') && !text.includes('LinkedIn') && text.length > 2) {
                            name = text;
                            break;
                        }
                    }
                }

                // Strategy 2: From page title (but validate it's not a privacy message)
                if (!name) {
                    const title = document.title;
                    if (title && !title.includes('LinkedIn') && !title.includes('privacy')) {
                        name = title.replace(/\s*\|.*$/, '').trim();
                        // Remove notification badges like "(1) "
                        name = name.replace(/^\(\d+\)\s+/, '');
                    }
                }

                // Strategy 3: From any h1 tag (last resort)
                if (!name) {
                    const h1 = document.querySelector('h1');
                    const h1Text = h1?.textContent?.trim() || '';
                    // Only use if it's not the privacy message
                    if (h1Text && !h1Text.includes('privacy') && !h1Text.includes('LinkedIn')) {
                        name = h1Text;
                    } else {
                        name = 'LinkedIn Member'; // Fallback
                    }
                }


                // --- HEADLINE ---
                let headline = '';
                // Strategy 1: Standard class
                const headlineEl = document.querySelector('.text-body-medium');
                if (headlineEl) headline = headlineEl.textContent?.trim() || '';

                // Strategy 2: Look for element after H1
                if (!headline) {
                    const h1 = document.querySelector('h1');
                    if (h1 && h1.nextElementSibling) {
                        headline = h1.nextElementSibling.textContent?.trim() || '';
                    }
                }

                if (!headline && name) {
                    // Try to find name element and get next sibling
                    // This is risky but a good fallback
                    const allTags = document.querySelectorAll('h1, div, span, p');
                    for (let i = 0; i < allTags.length; i++) {
                        if (allTags[i].textContent?.trim() === name) {
                            const next = allTags[i].nextElementSibling;
                            if (next && next.textContent && next.textContent.length > 5) {
                                headline = next.textContent.trim();
                                break;
                            }
                        }
                    }
                }

                // --- ABOUT ---
                let about = '';
                let aboutHeader = null;
                // Inline finding logic for About header
                const aboutTags = ['h2', 'span', 'p', 'div'];
                for (let t = 0; t < aboutTags.length; t++) {
                    const elements = document.querySelectorAll(aboutTags[t]);
                    for (let i = 0; i < elements.length; i++) {
                        if (elements[i].textContent?.trim() === 'About') {
                            aboutHeader = elements[i];
                            break;
                        }
                    }
                    if (aboutHeader) break;
                }

                if (aboutHeader) {
                    let container: any = aboutHeader.parentElement;
                    // Go up a few levels to find the section container
                    let attempts = 0;
                    while (container && attempts < 5) {
                        if (container.tagName === 'SECTION' || (container.className && container.className.includes('card'))) {
                            break;
                        }
                        container = container.parentElement;
                        attempts++;
                    }

                    if (container) {
                        // Look for the specific text container classes first
                        const aboutText = container.querySelector('.inline-show-more-text, .pv-shared-text-with-see-more, .display-flex .visibly-hidden');
                        if (aboutText) {
                            about = aboutText.textContent?.trim() || '';
                        } else {
                            // Fallback: Get all text but exclude the header "About"
                            const fullText = container.innerText || container.textContent || '';
                            about = fullText.replace(/About/i, '').trim();
                        }

                        // Remove duplicate lines (sometimes LinkedIn repeats content)
                        const lines = about.split('\n').map(line => line.trim()).filter(line => line.length > 0);
                        const uniqueLines = Array.from(new Set(lines));
                        about = uniqueLines.join('\n');
                    }
                }

                // --- SKILLS ---
                const skills: string[] = [];
                // Strategy 1: Standard classes
                const skillElements = document.querySelectorAll('[data-field="skill_card_skill_topic"] .mr1, .pv-skill-category-entity__name, .artdeco-list__item .display-flex.align-items-center.mr1.hoverable-link-text');
                for (let i = 0; i < skillElements.length; i++) {
                    const el = skillElements[i];
                    const skill = el.textContent?.trim();
                    if (skill && skill.length > 0 && skill.length < 50) {
                        skills.push(skill);
                    }
                }

                // Strategy 2: Find "Skills" section
                if (skills.length === 0) {
                    let skillsHeader = null;
                    // Inline finding logic for Skills header
                    const skillsTags = ['h2', 'span', 'p', 'div'];
                    for (let t = 0; t < skillsTags.length; t++) {
                        const elements = document.querySelectorAll(skillsTags[t]);
                        for (let i = 0; i < elements.length; i++) {
                            if (elements[i].textContent?.trim() === 'Skills') {
                                skillsHeader = elements[i];
                                break;
                            }
                        }
                        if (skillsHeader) break;
                    }

                    if (skillsHeader) {
                        let container: any = skillsHeader.parentElement;
                        let attempts = 0;
                        while (container && attempts < 5) {
                            if (container.tagName === 'SECTION' || (container.className && container.className.includes('card'))) {
                                break;
                            }
                            container = container.parentElement;
                            attempts++;
                        }

                        if (container) {
                            const items = container.querySelectorAll('li, .pvs-list__item--line-separated, .artdeco-list__item');
                            for (let i = 0; i < items.length; i++) {
                                const item = items[i];
                                // Try to find the skill name inside the item
                                const textEl = item.querySelector('span[aria-hidden="true"]') || item.querySelector('.mr1') || item;
                                const text = textEl.textContent?.trim();
                                // Filter out common non-skill text
                                if (text && text !== 'Skills' && text.length > 1 && !text.includes('Endorsed')) {
                                    skills.push(text);
                                }
                            }
                        }
                    }
                }

                // Deduplicate and fix concatenated skills
                const processedSkills: string[] = [];
                const seen = new Set<string>();

                for (const skill of skills) {
                    // Split concatenated skills (e.g., "Business DevelopmentBusiness Development" -> ["Business Development"])
                    // Pattern: repeatedly find and extract the first meaningful phrase before it repeats
                    const cleanSkill = skill.trim();

                    // Check if skill is duplicated within itself (e.g., "ABCABC")
                    const halfLength = Math.floor(cleanSkill.length / 2);
                    const firstHalf = cleanSkill.substring(0, halfLength);
                    const secondHalf = cleanSkill.substring(halfLength);

                    let finalSkill = cleanSkill;
                    if (firstHalf === secondHalf && firstHalf.length > 0) {
                        // It's duplicated, use only first half
                        finalSkill = firstHalf;
                    }

                    // Add to results if not already seen
                    const normalized = finalSkill.toLowerCase();
                    if (!seen.has(normalized) && finalSkill.length > 1 && finalSkill.length < 50) {
                        seen.add(normalized);
                        processedSkills.push(finalSkill);
                    }
                }

                // Replace skills array with processed version
                skills.length = 0;
                skills.push(...processedSkills);

                console.log('[LinkedIn Scraper] Extracting posts...');
                const posts: string[] = [];
                const postElements = document.querySelectorAll('.feed-shared-update-v2__description, .feed-shared-text, .update-components-text');
                const seenPosts = new Set<string>();
                for (let i = 0; i < postElements.length; i++) {
                    if (posts.length >= 5) break; // Limit to 5 unique posts
                    const el = postElements[i];
                    const postText = el.textContent?.trim();
                    if (postText && postText.length > 20) {
                        // Deduplicate by checking first 100 chars
                        const postKey = postText.substring(0, 100);
                        if (!seenPosts.has(postKey)) {
                            seenPosts.add(postKey);
                            posts.push(postText); // Store full text, not truncated
                        }
                    }
                }

                // --- EXPERIENCE ---
                const experiences: any[] = [];
                const expElements = document.querySelectorAll('#experience ~ .pvs-list__outer-container .pvs-entity, .pv-entity__position-group-pager li');
                for (let i = 0; i < expElements.length; i++) {
                    if (i >= 3) break;
                    const el = expElements[i];
                    const title = el.querySelector('.mr1 span[aria-hidden="true"]')?.textContent?.trim();
                    const company = el.querySelector('.t-14.t-normal span[aria-hidden="true"]')?.textContent?.trim();
                    if (title) {
                        experiences.push({ title, company: company || '' });
                    }
                }

                // --- INTERESTS ---
                const interests: string[] = [];
                const interestElements = document.querySelectorAll('.pv-interest-entity__name, [data-field="interests_entity_name"]');
                for (let i = 0; i < interestElements.length; i++) {
                    if (i >= 10) break;
                    const el = interestElements[i];
                    const interest = el.textContent?.trim();
                    if (interest) interests.push(interest);
                }

                // --- EDUCATION ---
                let education = '';
                const eduEl = document.querySelector('.pv-entity__school-name, [data-field="school_name"]');
                if (eduEl) {
                    education = eduEl.textContent?.trim() || '';
                }

                // --- LOCATION ---
                let location = '';
                const locationEl = document.querySelector('.text-body-small.inline.t-black--light.break-words, [data-field="location_name"]');
                if (locationEl) {
                    location = locationEl.textContent?.trim() || '';
                }

                const activityIndicators = {
                    hasRecentPosts: posts.length > 0,
                    postCount: posts.length,
                    skillCount: skills.length,
                    interestCount: interests.length,
                };

                // Extract company from headline
                let currentCompany = '';
                if (headline) {
                    // Try patterns: " at ", " AT ", " @ " (case-insensitive)
                    const companyMatch = headline.match(/(?:^|\s)(?:at|AT|@)\s+(.+?)$/i);
                    if (companyMatch && companyMatch[1]) {
                        currentCompany = companyMatch[1].trim();
                    } else {
                        // Fallback: Try to extract company after common titles
                        const titlePattern = /(?:CEO|CTO|CFO|COO|VP|Vice President|Director|Manager|Head|Lead|Senior|Engineer|Developer|Designer|Analyst)\s+(?:of\s+)?(.+?)$/i;
                        const titleMatch = headline.match(titlePattern);
                        if (titleMatch && titleMatch[1]) {
                            currentCompany = titleMatch[1].trim();
                        }
                    }
                }

                return {
                    name: name,
                    headline: headline,
                    about: about.substring(0, 1000), // Limit length
                    location: location,
                    education: education,
                    skills: skills,
                    posts: posts,
                    experiences: experiences,
                    interests: interests,
                    currentCompany: currentCompany,  // Add company to return object
                    activityIndicators: {
                        hasRecentPosts: posts.length > 0,
                        postCount: posts.length,
                        skillCount: skills.length,
                        interestCount: interests.length
                    }
                };
            });

            // Extract profile image (MUST be outside page.evaluate)
            console.log('[LinkedIn Scraper] ===== Starting profile image extraction =====');
            console.log('[LinkedIn Scraper] Current profileImageUrl value:', profileImageUrl);
            const imgSelectors = [
                // THE CORRECT SELECTOR - Main profile card large photo
                'img.pv-top-card-profile-picture__image--show',
                // Fallbacks in order of specificity
                'img.UgnrzJlIRcvqEIOsvocDXABYdVjhAtGscSZRQ', // LinkedIn's obfuscated class
                'img[alt]:not([alt*="Nikhil"]):not(.global-nav__me-photo)[src*="profile-displayphoto"][width="200"]',
                'img.pv-top-card-profile-picture__image',
                'div.pv-top-card img[width="200"]',
                'img.profile-photo',
                'img[data-delayed-url*="profile"]',
                '.pv-top-card--photo img',
                'button.pv-top-card-profile-picture img'
            ];

            for (const selector of imgSelectors) {
                console.log(`[LinkedIn Scraper] Trying selector: ${selector}`);
                const img = await this.page.$(selector);
                if (img) {
                    console.log(`[LinkedIn Scraper] Found element with selector: ${selector}`);
                    const src = await img.evaluate((el: any) => el.src || el.getAttribute('data-delayed-url'));
                    console.log(`[LinkedIn Scraper] Extracted src:`, src);
                    if (src && src.startsWith('http')) {
                        profileImageUrl = src;
                        console.log('[LinkedIn Scraper] ✅ SUCCESS! Profile image URL set to:', profileImageUrl);
                        break;
                    } else {
                        console.log(`[LinkedIn Scraper] ❌ Src is invalid or missing:`, src);
                    }
                } else {
                    console.log(`[LinkedIn Scraper] ❌ Element not found for selector: ${selector}`);
                }
            }

            console.log('[LinkedIn Scraper] ==== Final profileImageUrl value:', profileImageUrl);

            // Add email and other required fields to profile object
            // Use fallback email if no email was found
            (profile as any).email = email || FALLBACK_EMAIL;
            (profile as any).url = url;
            (profile as any).id = url.split('/in/')[1]?.split('/')[0] || 'unknown';
            (profile as any).profileImageUrl = profileImageUrl;

            // Override name if it contains privacy message and we have a better name from search results
            if (profileName && (profile.name.toLowerCase().includes('privacy') || profile.name.toLowerCase().includes('linkedin'))) {
                console.log(`[LinkedIn Scraper] Overriding extracted name "${profile.name}" with search result name "${profileName}"`);
                (profile as any).name = profileName;
            }

            console.log(`[LinkedIn Scraper] Extracted profile data:`, {
                name: profile.name,
                skills: profile.skills.length,
                posts: profile.posts.length,
                interests: profile.interests.length,
                email: email ? `Found: ${email}` : `Using fallback: ${FALLBACK_EMAIL}`
            });

            // Keep browser open for a short time for debugging if needed, but not 60s
            // console.log('[LinkedIn Scraper] Keeping browser open for 60 seconds for debugging...');
            // await new Promise(resolve => setTimeout(resolve, 60000));


            // Save to Archives (Database)
            try {
                const { storage } = await import('../storage.js');

                // Extract company name from headline (e.g., "VP Sales at Microsoft" OR "VP @ Microsoft" → "Microsoft")
                let companyName: string | null = null;
                if (profile.headline) {
                    // Match both "at Company" and "@ Company" patterns, stop at pipe or end
                    const match = profile.headline.match(/\s+(?:at|@)\s+(.+?)(?:\s*\||$)/i);
                    if (match && match[1]) {
                        companyName = match[1].trim();
                    }
                }

                await storage.createScrapedProfile(userId, {
                    name: profile.name,
                    headline: profile.headline,
                    company: companyName,
                    location: profile.location,
                    url: url, // Use the input URL as it's cleaner
                    email: email || FALLBACK_EMAIL,
                    avatar: profileImageUrl,
                    about: profile.about || null,
                    skills: profile.skills || []
                });
                console.log('[LinkedIn Scraper] Profile saved to archives');
            } catch (dbError) {
                console.error('[LinkedIn Scraper] Failed to save profile to archives:', dbError);
            }

            await this.cleanup();

            return profile as unknown as ProfileResult;

        } catch (error: any) {
            console.error('[LinkedIn Scraper] Profile scraping error:', error);
            await this.cleanup();
            throw error;
        }
    }

    /**
     * Cleanup browser resources
     */
    private async cleanup() {
        try {
            if (this.page) {
                await this.page.close();
                this.page = null;
            }
            if (this.browser) {
                await this.browser.close();
                this.browser = null;
            }
        } catch (error) {
            console.error("[LinkedIn Scraper] Cleanup error:", error);
        }
    }
}

export const linkedInScraper = new LinkedInScraperService();
