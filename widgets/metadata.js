'use strict';

import Gio from 'gi://Gio';

const metadataFile = Gio.File.new_for_uri(import.meta.url).get_parent()
    .get_parent().get_child('metadata.json');

let PROJECT_URL = 'https://github.com/peter-njoro/glass-widgets';

metadataFile.load_contents_async(null, (_file, result) => {
    try {
        const [, contents] = metadataFile.load_contents_finish(result);
        PROJECT_URL = JSON.parse(new TextDecoder().decode(contents)).url;
    } catch {
        // Keep the fallback URL if reading fails.
    }
});

export { PROJECT_URL };