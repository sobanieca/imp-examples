Move the examples to the plain application map of imp (the imp-ui pull request simple-app-map-and-labels).

Do this after imp ships that change.

- observability/src/app-map.js, and the map of every other example: keep only children and description. Remove label, access, nav, group and path. Rename the index node to the top-level key home. Give each param of one chain its own name.
- Bind each access value as router({ access, need: { [app.x]: value } }). Move nav: false to shell({ navbar: { map, hide: [...] } }) and group to navbar.groups. Remove router({ options }).
- locales: remove the appMap.<id>.group messages. A group title is the key of navbar.groups, and a message with that key translates it.
- Each screen with a param crumb: write its label before setup resolves, with useState(self, 'imp.routeLabels').set((all) => ({ ...all, $id: name })).
- Run imp skill routing for the rules.

Check: imp lint and the tests of each example pass. imp map prints every node with no other prop. A param crumb shows the loader while its screen loads, then its name, never the raw id.
