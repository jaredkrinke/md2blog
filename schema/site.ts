// Do not edit by hand. This file was generated by json-schema-aot.

export type HexColor = string;

/** Format for md2blog site metadata file (site.json). */
export interface SiteMetadata {
    /** Title for the site (displayed at the top of every page). */
    title: string;
    /** Optional (but recommended) description of the site (used in meta tags and also used as the default subtitle on all pages). */
    description?: string;
    /** Optional (but recommended) URL for the root of the site (used in Atom feed and Open Graph links). */
    url?: string;
    /** Optional object specifying colors to use on the site. Note that all colors are reused for syntax highlighting. */
    colors?: {
        /** Color used for the site title. */
        title?: HexColor;
        /** Color used for headings. */
        heading?: HexColor;
        /** Color used links. */
        link?: HexColor;
        /** Color used only for syntax highlighting (generally for comments). */
        comment?: HexColor;
    };
}

// deno-lint-ignore no-explicit-any
function parseHexColor(json: any) {
    if (typeof(json) !== "string") {
        throw `JSON validation error at "$defs.hexColor": expected string, but encountered ${typeof(json)}`;
    }
    if (!(/^#[0-9a-fA-F]{6}$/.test(json))) {
        throw `JSON validation error at "$defs.hexColor": string did not match pattern /^#[0-9a-fA-F]{6}$/: ${json}`;
    }
    return json;
    
}

// deno-lint-ignore no-explicit-any
export function parse(json: any): SiteMetadata {
    if (json === null) {
        throw `JSON validation error at root: expected object, but encountered null`;
    } else if (typeof(json) !== "object") {
        throw `JSON validation error at root: expected object, but encountered ${typeof(json)}`;
    } else if (Array.isArray(json)) {
        throw `JSON validation error at root: expected object, but encountered an array`;
    }
    
    let jsonRequiredPropertyCount = 0;
    // deno-lint-ignore no-explicit-any
    const jsonResultObject: any = {};
    // deno-lint-ignore no-explicit-any
    for (const [jsonKey, jsonValue] of Object.entries(json as Record<string, any>)) {
        jsonResultObject[jsonKey] = (() => {
            switch (jsonKey) {
                case "$schema": {
                    
                    if (typeof(jsonValue) !== "string") {
                        throw `JSON validation error at "$schema": expected string, but encountered ${typeof(jsonValue)}`;
                    }
                    return jsonValue;
                    
                }
                
                case "title": {
                    
                    ++jsonRequiredPropertyCount;
                    if (typeof(jsonValue) !== "string") {
                        throw `JSON validation error at "title": expected string, but encountered ${typeof(jsonValue)}`;
                    }
                    return jsonValue;
                    
                }
                
                case "description": {
                    
                    if (typeof(jsonValue) !== "string") {
                        throw `JSON validation error at "description": expected string, but encountered ${typeof(jsonValue)}`;
                    }
                    return jsonValue;
                    
                }
                
                case "url": {
                    
                    if (typeof(jsonValue) !== "string") {
                        throw `JSON validation error at "url": expected string, but encountered ${typeof(jsonValue)}`;
                    }
                    return jsonValue;
                    
                }
                
                case "colors": {
                    
                    if (jsonValue === null) {
                        throw `JSON validation error at "colors": expected object, but encountered null`;
                    } else if (typeof(jsonValue) !== "object") {
                        throw `JSON validation error at "colors": expected object, but encountered ${typeof(jsonValue)}`;
                    } else if (Array.isArray(jsonValue)) {
                        throw `JSON validation error at "colors": expected object, but encountered an array`;
                    }
                    
                    // deno-lint-ignore no-explicit-any
                    const jsonValueResultObject: any = {};
                    // deno-lint-ignore no-explicit-any
                    for (const [jsonValueKey, jsonValueValue] of Object.entries(jsonValue as Record<string, any>)) {
                        jsonValueResultObject[jsonValueKey] = (() => {
                            switch (jsonValueKey) {
                                case "title": {
                                    
                                    return parseHexColor(jsonValueValue);
                                    
                                }
                                
                                case "heading": {
                                    
                                    return parseHexColor(jsonValueValue);
                                    
                                }
                                
                                case "link": {
                                    
                                    return parseHexColor(jsonValueValue);
                                    
                                }
                                
                                case "comment": {
                                    
                                    return parseHexColor(jsonValueValue);
                                    
                                }
                                
                                
                            }
                        })();
                    }
                    return jsonValueResultObject;
                    
                }
                
                default: {
                    throw `JSON validation error at root: encountered unexpected property: ${jsonKey}`;
                }
            }
        })();
    }
    
    if (jsonRequiredPropertyCount !== 1) {
        throw `JSON validation error at root: missing at least one required property from the list: [title]`;
    }
    return jsonResultObject;
    
}

// deno-lint-ignore no-explicit-any
export function validate(json: any) {
    parse(json);
}

