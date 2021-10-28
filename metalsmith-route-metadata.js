import Route from "route-parser";

export default options => {
    options = options ?? {};

    const rows = Object.keys(options).map(pattern => ({
        route: new Route(pattern),
        defaultValues: options[pattern],
    }));

    return (files, metalsmith, done) => {
        rows.forEach(row => {
            const { route, defaultValues } = row;
            Object.keys(files).forEach(fileName => {
                // Test for match
                const match = route.match(fileName.replace(/\\/g, "/"));
                if (match) {
                    // Add in default values, as needed
                    Object.keys(defaultValues).forEach(key => {
                        if (!match[key]) {
                            match[key] = defaultValues[key];
                        }
                    });

                    // Apply to file
                    const file = files[fileName];
                    Object.keys(match).forEach(key => {
                        file[key] = match[key];
                    });
                }
            });
        });

        done();
    };
};
