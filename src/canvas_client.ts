export interface CourseResponse {
    id: number;
    name: string;
    course_code: string;
}

export interface SectionResponse {
    id: number;
    name: string;
    course_id: number;
}

type PageResponse<T> = {
    data: T[];
    hasNext: boolean;
}

type SimpleDict = { [key: string]: string | number };

function parseLinkHeader(header: string): SimpleDict {
    const links = {};
    const parts = header.split(',');
    for (const part of parts) {
        const section = part.split(';');
        if (section.length !== 2) continue;
        const url = section[0].replace(/<(.*)>/, '$1').trim();
        const rel = section[1].replace(/rel="(.*)"/, '$1').trim();
        links[rel] = url;
    }
    return links;
}

function formatQueryString(params: SimpleDict) {
    return Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
}

export class CanvasClient {
    #token = process.env.CANVAS_TOKEN;
    #baseUrl = "https://canvas.hu.nl/api/v1";


    async #getPage(url: string, page: number, pageSize: number, otherOptions: SimpleDict = {}) : Promise<PageResponse<CourseResponse>> {
        let options = {
            page: page,
            per_page: pageSize,
            ...otherOptions
        };
        
        let response = await fetch(`${this.#baseUrl}/${url}?${formatQueryString(options)}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${this.#token}`
            }
        });
        if (!response.ok) {
            throw new Error(`Error fetching courses: ${response.statusText}`);
        }
        let linkHeader = response.headers.get('link');
        let links = linkHeader ? parseLinkHeader(linkHeader) : {};
        let hasNext = links['next'] !== undefined;
        let isLast = links['last'] === links['current'];
        if (hasNext && isLast) {
            hasNext = false;
        }
        let data = await response.json();
        return {
            data: data,
            hasNext: hasNext
        };
    }

    async getPages(url: string, options = {}) : Promise<CourseResponse[]> {
        let pageNr = 1;
        let page = await this.#getPage(url, pageNr, 100, options);
        let data = page.data;
        while(page.hasNext){
            pageNr++;
            page = await this.#getPage(url, pageNr, 100, options);
            data = data.concat(page.data);
        }
    
        return data;
    }

    getCourses(){
        return this.getPages('courses');
    }

    getSections() {

    }
}

if(require.main === module) {
    const client = new CanvasClient();
    client.getCourses().then(r => console.log(r.length));
}