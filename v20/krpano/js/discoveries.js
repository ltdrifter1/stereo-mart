/*
 * Hidden-discovery tracking for the shop.
 * krpano's egg_found action calls smDiscoveries.message(id, label) via
 * jsget; finds persist per browser so returning visitors keep hunting.
 */
window.smDiscoveries = (function () {
	var KEY = "sm.discoveries.v1";
	var TOTAL = 5; // cat, ghost, rabbit, turtle, mushroom — keep in sync with hotspots-life.xml

	function load() {
		try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
		catch (e) { return {}; }
	}

	function save(d) {
		try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* private mode */ }
	}

	function found(id) {
		var d = load();
		var first = !d[id];
		d[id] = Date.now();
		save(d);
		return first;
	}

	function count() {
		return Object.keys(load()).length;
	}

	function message(id, label) {
		var first = found(id);
		var c = count();
		var tally = " · " + c + "/" + TOTAL + " found";
		if (first && c === TOTAL) return "you found " + label + " — that's all of them. or is it?";
		return (first ? "you found " : "hello again, ") + label + tally;
	}

	return { found: found, count: count, message: message };
})();
