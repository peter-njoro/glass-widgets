'use strict';

import Gio from 'gi://Gio';

const metadataFile = Gio.File.new_for_uri(import.meta.url).get_parent()
    .get_parent().get_child('metadata.json');
const [, contents] = metadataFile.load_contents(null);

export const PROJECT_URL = JSON.parse(new TextDecoder().decode(contents)).url;