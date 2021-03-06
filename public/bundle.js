
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (!store || typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, callback) {
        const unsub = store.subscribe(callback);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            $$.fragment && $$.fragment.p($$.ctx, $$.dirty);
            $$.dirty = [-1];
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /* src/components/loading/loading.svelte generated by Svelte v3.16.4 */

    const file = "src/components/loading/loading.svelte";

    function create_fragment(ctx) {
    	let div6;
    	let div5;
    	let div4;
    	let div0;
    	let t0;
    	let div1;
    	let t1;
    	let div2;
    	let t2;
    	let div3;
    	let t3;
    	let span;

    	const block = {
    		c: function create() {
    			div6 = element("div");
    			div5 = element("div");
    			div4 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			t1 = space();
    			div2 = element("div");
    			t2 = space();
    			div3 = element("div");
    			t3 = space();
    			span = element("span");
    			span.textContent = "Loading...";
    			attr_dev(div0, "class", "sk-cube1 sk-cube svelte-1psw096");
    			add_location(div0, file, 147, 6, 3512);
    			attr_dev(div1, "class", "sk-cube2 sk-cube svelte-1psw096");
    			add_location(div1, file, 148, 6, 3551);
    			attr_dev(div2, "class", "sk-cube4 sk-cube svelte-1psw096");
    			add_location(div2, file, 149, 6, 3590);
    			attr_dev(div3, "class", "sk-cube3 sk-cube svelte-1psw096");
    			add_location(div3, file, 150, 6, 3629);
    			attr_dev(div4, "class", "sk-folding-cube svelte-1psw096");
    			add_location(div4, file, 146, 4, 3476);
    			attr_dev(span, "class", "loading-text");
    			add_location(span, file, 152, 4, 3677);
    			attr_dev(div5, "class", "preview-area svelte-1psw096");
    			add_location(div5, file, 145, 2, 3445);
    			set_style(div6, "backgroundColor", /*bgColor*/ ctx[0] + " , width: '100vW', height: '100vH' ");
    			attr_dev(div6, "class", "loading-box svelte-1psw096");
    			add_location(div6, file, 142, 0, 3343);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div6, anchor);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, div0);
    			append_dev(div4, t0);
    			append_dev(div4, div1);
    			append_dev(div4, t1);
    			append_dev(div4, div2);
    			append_dev(div4, t2);
    			append_dev(div4, div3);
    			append_dev(div5, t3);
    			append_dev(div5, span);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*bgColor*/ 1) {
    				set_style(div6, "backgroundColor", /*bgColor*/ ctx[0] + " , width: '100vW', height: '100vH' ");
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div6);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { bgColor = "#697689" } = $$props;
    	const writable_props = ["bgColor"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Loading> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("bgColor" in $$props) $$invalidate(0, bgColor = $$props.bgColor);
    	};

    	$$self.$capture_state = () => {
    		return { bgColor };
    	};

    	$$self.$inject_state = $$props => {
    		if ("bgColor" in $$props) $$invalidate(0, bgColor = $$props.bgColor);
    	};

    	return [bgColor];
    }

    class Loading extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { bgColor: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Loading",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get bgColor() {
    		throw new Error("<Loading>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set bgColor(value) {
    		throw new Error("<Loading>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe,
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => store.subscribe((value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    function regexparam (str, loose) {
    	if (str instanceof RegExp) return { keys:false, pattern:str };
    	var c, o, tmp, ext, keys=[], pattern='', arr = str.split('/');
    	arr[0] || arr.shift();

    	while (tmp = arr.shift()) {
    		c = tmp[0];
    		if (c === '*') {
    			keys.push('wild');
    			pattern += '/(.*)';
    		} else if (c === ':') {
    			o = tmp.indexOf('?', 1);
    			ext = tmp.indexOf('.', 1);
    			keys.push( tmp.substring(1, !!~o ? o : !!~ext ? ext : tmp.length) );
    			pattern += !!~o && !~ext ? '(?:/([^/]+?))?' : '/([^/]+?)';
    			if (!!~ext) pattern += (!!~o ? '?' : '') + '\\' + tmp.substring(ext);
    		} else {
    			pattern += '/' + tmp;
    		}
    	}

    	return {
    		keys: keys,
    		pattern: new RegExp('^' + pattern + (loose ? '(?=$|\/)' : '\/?$'), 'i')
    	};
    }

    /* node_modules/svelte-spa-router/Router.svelte generated by Svelte v3.16.4 */

    const { Error: Error_1, Object: Object_1 } = globals;

    function create_fragment$1(ctx) {
    	let switch_instance_anchor;
    	let current;
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		return {
    			props: { params: /*componentParams*/ ctx[1] },
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		var switch_instance = new switch_value(switch_props(ctx));
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = {};
    			if (dirty[0] & /*componentParams*/ 2) switch_instance_changes.params = /*componentParams*/ ctx[1];

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function wrap(route, userData, ...conditions) {
    	if (userData && typeof userData == "function") {
    		conditions = conditions && conditions.length ? conditions : [];
    		conditions.unshift(userData);
    		userData = undefined;
    	}

    	if (!route || typeof route != "function") {
    		throw Error("Invalid parameter route");
    	}

    	if (conditions && conditions.length) {
    		for (let i = 0; i < conditions.length; i++) {
    			if (!conditions[i] || typeof conditions[i] != "function") {
    				throw Error("Invalid parameter conditions[" + i + "]");
    			}
    		}
    	}

    	const obj = { route, userData };

    	if (conditions && conditions.length) {
    		obj.conditions = conditions;
    	}

    	Object.defineProperty(obj, "_sveltesparouter", { value: true });
    	return obj;
    }

    function getLocation() {
    	const hashPosition = window.location.href.indexOf("#/");

    	let location = hashPosition > -1
    	? window.location.href.substr(hashPosition + 1)
    	: "/";

    	const qsPosition = location.indexOf("?");
    	let querystring = "";

    	if (qsPosition > -1) {
    		querystring = location.substr(qsPosition + 1);
    		location = location.substr(0, qsPosition);
    	}

    	return { location, querystring };
    }

    const loc = readable(getLocation(), function start(set) {
    	const update = () => {
    		set(getLocation());
    	};

    	window.addEventListener("hashchange", update, false);

    	return function stop() {
    		window.removeEventListener("hashchange", update, false);
    	};
    });

    const location = derived(loc, $loc => $loc.location);
    const querystring = derived(loc, $loc => $loc.querystring);

    function replace(location) {
    	if (!location || location.length < 1 || location.charAt(0) != "/" && location.indexOf("#/") !== 0) {
    		throw Error("Invalid parameter location");
    	}

    	setTimeout(
    		() => {
    			const dest = (location.charAt(0) == "#" ? "" : "#") + location;
    			history.replaceState(undefined, undefined, dest);
    			window.dispatchEvent(new Event("hashchange"));
    		},
    		0
    	);
    }

    function link(node) {
    	if (!node || !node.tagName || node.tagName.toLowerCase() != "a") {
    		throw Error("Action \"link\" can only be used with <a> tags");
    	}

    	const href = node.getAttribute("href");

    	if (!href || href.length < 1 || href.charAt(0) != "/") {
    		throw Error("Invalid value for \"href\" attribute");
    	}

    	node.setAttribute("href", "#" + href);
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $loc,
    		$$unsubscribe_loc = noop;

    	validate_store(loc, "loc");
    	component_subscribe($$self, loc, $$value => $$invalidate(4, $loc = $$value));
    	$$self.$$.on_destroy.push(() => $$unsubscribe_loc());
    	let { routes = {} } = $$props;
    	let { prefix = "" } = $$props;

    	class RouteItem {
    		constructor(path, component) {
    			if (!component || typeof component != "function" && (typeof component != "object" || component._sveltesparouter !== true)) {
    				throw Error("Invalid component object");
    			}

    			if (!path || typeof path == "string" && (path.length < 1 || path.charAt(0) != "/" && path.charAt(0) != "*") || typeof path == "object" && !(path instanceof RegExp)) {
    				throw Error("Invalid value for \"path\" argument");
    			}

    			const { pattern, keys } = regexparam(path);
    			this.path = path;

    			if (typeof component == "object" && component._sveltesparouter === true) {
    				this.component = component.route;
    				this.conditions = component.conditions || [];
    				this.userData = component.userData;
    			} else {
    				this.component = component;
    				this.conditions = [];
    				this.userData = undefined;
    			}

    			this._pattern = pattern;
    			this._keys = keys;
    		}

    		match(path) {
    			if (prefix && path.startsWith(prefix)) {
    				path = path.substr(prefix.length) || "/";
    			}

    			const matches = this._pattern.exec(path);

    			if (matches === null) {
    				return null;
    			}

    			if (this._keys === false) {
    				return matches;
    			}

    			const out = {};
    			let i = 0;

    			while (i < this._keys.length) {
    				out[this._keys[i]] = matches[++i] || null;
    			}

    			return out;
    		}

    		checkConditions(detail) {
    			for (let i = 0; i < this.conditions.length; i++) {
    				if (!this.conditions[i](detail)) {
    					return false;
    				}
    			}

    			return true;
    		}
    	}

    	const routesIterable = routes instanceof Map ? routes : Object.entries(routes);
    	const routesList = [];

    	for (const [path, route] of routesIterable) {
    		routesList.push(new RouteItem(path, route));
    	}

    	let component = null;
    	let componentParams = {};
    	const dispatch = createEventDispatcher();

    	const dispatchNextTick = (name, detail) => {
    		setTimeout(
    			() => {
    				dispatch(name, detail);
    			},
    			0
    		);
    	};

    	const writable_props = ["routes", "prefix"];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("routes" in $$props) $$invalidate(2, routes = $$props.routes);
    		if ("prefix" in $$props) $$invalidate(3, prefix = $$props.prefix);
    	};

    	$$self.$capture_state = () => {
    		return {
    			routes,
    			prefix,
    			component,
    			componentParams,
    			$loc
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("routes" in $$props) $$invalidate(2, routes = $$props.routes);
    		if ("prefix" in $$props) $$invalidate(3, prefix = $$props.prefix);
    		if ("component" in $$props) $$invalidate(0, component = $$props.component);
    		if ("componentParams" in $$props) $$invalidate(1, componentParams = $$props.componentParams);
    		if ("$loc" in $$props) loc.set($loc = $$props.$loc);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*component, $loc*/ 17) {
    			 {
    				$$invalidate(0, component = null);
    				let i = 0;

    				while (!component && i < routesList.length) {
    					const match = routesList[i].match($loc.location);

    					if (match) {
    						const detail = {
    							component: routesList[i].component,
    							name: routesList[i].component.name,
    							location: $loc.location,
    							querystring: $loc.querystring,
    							userData: routesList[i].userData
    						};

    						if (!routesList[i].checkConditions(detail)) {
    							dispatchNextTick("conditionsFailed", detail);
    							break;
    						}

    						$$invalidate(0, component = routesList[i].component);
    						$$invalidate(1, componentParams = match);
    						dispatchNextTick("routeLoaded", detail);
    					}

    					i++;
    				}
    			}
    		}
    	};

    	return [component, componentParams, routes, prefix];
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { routes: 2, prefix: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get routes() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set routes(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get prefix() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set prefix(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/nav/nav.svelte generated by Svelte v3.16.4 */
    const file$1 = "src/components/nav/nav.svelte";

    // (38:6) {#if user && user.id !== 0}
    function create_if_block_1(ctx) {
    	let a0;
    	let link_action;
    	let t1;
    	let a1;
    	let link_action_1;

    	const block = {
    		c: function create() {
    			a0 = element("a");
    			a0.textContent = "Home";
    			t1 = space();
    			a1 = element("a");
    			a1.textContent = "Sessions";
    			attr_dev(a0, "href", "/");
    			attr_dev(a0, "class", "block mt-4 lg:inline-block lg:mt-0 text-white hover:text-white\n          mr-4");
    			add_location(a0, file$1, 38, 8, 1207);
    			attr_dev(a1, "href", "/admin/sessions");
    			attr_dev(a1, "class", "block mt-4 lg:inline-block lg:mt-0 text-white hover:text-white\n          mr-4");
    			add_location(a1, file$1, 45, 8, 1381);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a0, anchor);
    			link_action = link.call(null, a0) || ({});
    			insert_dev(target, t1, anchor);
    			insert_dev(target, a1, anchor);
    			link_action_1 = link.call(null, a1) || ({});
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a0);
    			if (link_action && is_function(link_action.destroy)) link_action.destroy();
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(a1);
    			if (link_action_1 && is_function(link_action_1.destroy)) link_action_1.destroy();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(38:6) {#if user && user.id !== 0}",
    		ctx
    	});

    	return block;
    }

    // (65:6) {:else}
    function create_else_block(ctx) {
    	let a;
    	let t0_value = /*user*/ ctx[0].firstname + "";
    	let t0;
    	let t1;
    	let t2_value = /*user*/ ctx[0].lastname + "";
    	let t2;
    	let link_action;
    	let dispose;

    	const block = {
    		c: function create() {
    			a = element("a");
    			t0 = text(t0_value);
    			t1 = space();
    			t2 = text(t2_value);
    			attr_dev(a, "href", "/");
    			attr_dev(a, "class", "inline-block text-sm px-4 py-2 leading-none border rounded\n          text-white border-white hover:border-transparent hover:text-blue-500\n          hover:bg-white mt-4 lg:mt-0");
    			add_location(a, file$1, 65, 8, 1935);
    			dispose = listen_dev(a, "click", /*logout*/ ctx[2], false, false, false);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, t0);
    			append_dev(a, t1);
    			append_dev(a, t2);
    			link_action = link.call(null, a) || ({});
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*user*/ 1 && t0_value !== (t0_value = /*user*/ ctx[0].firstname + "")) set_data_dev(t0, t0_value);
    			if (dirty[0] & /*user*/ 1 && t2_value !== (t2_value = /*user*/ ctx[0].lastname + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			if (link_action && is_function(link_action.destroy)) link_action.destroy();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(65:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (56:6) {#if !user || user.id === 0}
    function create_if_block(ctx) {
    	let a;
    	let link_action;

    	const block = {
    		c: function create() {
    			a = element("a");
    			a.textContent = "Signin";
    			attr_dev(a, "href", "/signin");
    			attr_dev(a, "class", "inline-block text-sm px-4 py-2 leading-none border rounded\n          text-white border-white hover:border-transparent hover:text-blue-500\n          hover:bg-white mt-4 lg:mt-0");
    			add_location(a, file$1, 56, 8, 1641);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			link_action = link.call(null, a) || ({});
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			if (link_action && is_function(link_action.destroy)) link_action.destroy();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(56:6) {#if !user || user.id === 0}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let nav;
    	let div0;
    	let i;
    	let t1;
    	let span;
    	let t3;
    	let div1;
    	let button;
    	let svg;
    	let title;
    	let t4;
    	let path;
    	let t5;
    	let div4;
    	let div2;
    	let t6;
    	let div3;
    	let dispose;
    	let if_block0 = /*user*/ ctx[0] && /*user*/ ctx[0].id !== 0 && create_if_block_1(ctx);

    	function select_block_type(ctx, dirty) {
    		if (!/*user*/ ctx[0] || /*user*/ ctx[0].id === 0) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block1 = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			div0 = element("div");
    			i = element("i");
    			i.textContent = "poll";
    			t1 = space();
    			span = element("span");
    			span.textContent = "HeroicPolls";
    			t3 = space();
    			div1 = element("div");
    			button = element("button");
    			svg = svg_element("svg");
    			title = svg_element("title");
    			t4 = text("Menu");
    			path = svg_element("path");
    			t5 = space();
    			div4 = element("div");
    			div2 = element("div");
    			if (if_block0) if_block0.c();
    			t6 = space();
    			div3 = element("div");
    			if_block1.c();
    			attr_dev(i, "class", "material-icons fill-current text-3xl mr-2");
    			add_location(i, file$1, 16, 4, 403);
    			attr_dev(span, "class", "font-semibold text-xl tracking-tight");
    			add_location(span, file$1, 17, 4, 469);
    			attr_dev(div0, "class", "flex items-center flex-shrink-0 text-white mr-6");
    			add_location(div0, file$1, 15, 2, 337);
    			add_location(title, file$1, 28, 8, 896);
    			attr_dev(path, "d", "M0 3h20v2H0V3zm0 6h20v2H0V9zm0 6h20v2H0v-2z");
    			add_location(path, file$1, 29, 8, 924);
    			attr_dev(svg, "class", "fill-current h-3 w-3");
    			attr_dev(svg, "viewBox", "0 0 20 20");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg, file$1, 24, 6, 774);
    			attr_dev(button, "class", "flex items-center px-3 py-2 border rounded text-white border-white\n      hover:text-white hover:border-white");
    			add_location(button, file$1, 20, 4, 584);
    			attr_dev(div1, "class", "block lg:hidden");
    			add_location(div1, file$1, 19, 2, 550);
    			attr_dev(div2, "class", "text-sm lg:flex-grow");
    			add_location(div2, file$1, 36, 4, 1130);
    			add_location(div3, file$1, 54, 4, 1592);
    			attr_dev(div4, "class", "w-full block flex-grow lg:flex lg:items-center lg:w-auto");
    			toggle_class(div4, "hidden", !/*menuVisible*/ ctx[1]);
    			add_location(div4, file$1, 33, 2, 1019);
    			attr_dev(nav, "class", "flex items-center justify-between flex-wrap bg-blue-500 p-6");
    			add_location(nav, file$1, 14, 0, 261);
    			dispose = listen_dev(button, "click", /*click_handler*/ ctx[4], false, false, false);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, div0);
    			append_dev(div0, i);
    			append_dev(div0, t1);
    			append_dev(div0, span);
    			append_dev(nav, t3);
    			append_dev(nav, div1);
    			append_dev(div1, button);
    			append_dev(button, svg);
    			append_dev(svg, title);
    			append_dev(title, t4);
    			append_dev(svg, path);
    			append_dev(nav, t5);
    			append_dev(nav, div4);
    			append_dev(div4, div2);
    			if (if_block0) if_block0.m(div2, null);
    			append_dev(div4, t6);
    			append_dev(div4, div3);
    			if_block1.m(div3, null);
    		},
    		p: function update(ctx, dirty) {
    			if (/*user*/ ctx[0] && /*user*/ ctx[0].id !== 0) {
    				if (!if_block0) {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					if_block0.m(div2, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(div3, null);
    				}
    			}

    			if (dirty[0] & /*menuVisible*/ 2) {
    				toggle_class(div4, "hidden", !/*menuVisible*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    			if (if_block0) if_block0.d();
    			if_block1.d();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { user } = $$props;
    	const dispatch = createEventDispatcher();

    	const logout = () => {
    		dispatch("logout");
    	};

    	let menuVisible = false;
    	const writable_props = ["user"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Nav> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => $$invalidate(1, menuVisible = !menuVisible);

    	$$self.$set = $$props => {
    		if ("user" in $$props) $$invalidate(0, user = $$props.user);
    	};

    	$$self.$capture_state = () => {
    		return { user, menuVisible };
    	};

    	$$self.$inject_state = $$props => {
    		if ("user" in $$props) $$invalidate(0, user = $$props.user);
    		if ("menuVisible" in $$props) $$invalidate(1, menuVisible = $$props.menuVisible);
    	};

    	return [user, menuVisible, logout, dispatch, click_handler];
    }

    class Nav extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { user: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Nav",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*user*/ ctx[0] === undefined && !("user" in props)) {
    			console.warn("<Nav> was created without expected prop 'user'");
    		}
    	}

    	get user() {
    		throw new Error("<Nav>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set user(value) {
    		throw new Error("<Nav>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/routes/public/Home.svelte generated by Svelte v3.16.4 */

    const file$2 = "src/routes/public/Home.svelte";

    function create_fragment$3(ctx) {
    	let h1;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Home";
    			add_location(h1, file$2, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function unwrapExports (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */
    /* global Reflect, Promise */

    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };

    function __extends(d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }

    var __assign = function() {
        __assign = Object.assign || function __assign(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };

    function __rest(s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
            t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                    t[p[i]] = s[p[i]];
            }
        return t;
    }

    function __decorate(decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    }

    function __param(paramIndex, decorator) {
        return function (target, key) { decorator(target, key, paramIndex); }
    }

    function __metadata(metadataKey, metadataValue) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
    }

    function __awaiter(thisArg, _arguments, P, generator) {
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    }

    function __generator(thisArg, body) {
        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while (_) try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
                if (y = 0, t) op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0: case 1: t = op; break;
                    case 4: _.label++; return { value: op[1], done: false };
                    case 5: _.label++; y = op[1]; op = [0]; continue;
                    case 7: op = _.ops.pop(); _.trys.pop(); continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                        if (t[2]) _.ops.pop();
                        _.trys.pop(); continue;
                }
                op = body.call(thisArg, _);
            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
        }
    }

    function __exportStar(m, exports) {
        for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
    }

    function __values(o) {
        var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
        if (m) return m.call(o);
        return {
            next: function () {
                if (o && i >= o.length) o = void 0;
                return { value: o && o[i++], done: !o };
            }
        };
    }

    function __read(o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m) return o;
        var i = m.call(o), r, ar = [], e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
        }
        catch (error) { e = { error: error }; }
        finally {
            try {
                if (r && !r.done && (m = i["return"])) m.call(i);
            }
            finally { if (e) throw e.error; }
        }
        return ar;
    }

    function __spread() {
        for (var ar = [], i = 0; i < arguments.length; i++)
            ar = ar.concat(__read(arguments[i]));
        return ar;
    }

    function __spreadArrays() {
        for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
        for (var r = Array(s), k = 0, i = 0; i < il; i++)
            for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
                r[k] = a[j];
        return r;
    }
    function __await(v) {
        return this instanceof __await ? (this.v = v, this) : new __await(v);
    }

    function __asyncGenerator(thisArg, _arguments, generator) {
        if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
        var g = generator.apply(thisArg, _arguments || []), i, q = [];
        return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
        function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
        function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
        function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
        function fulfill(value) { resume("next", value); }
        function reject(value) { resume("throw", value); }
        function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
    }

    function __asyncDelegator(o) {
        var i, p;
        return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
        function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: n === "return" } : f ? f(v) : v; } : f; }
    }

    function __asyncValues(o) {
        if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
        var m = o[Symbol.asyncIterator], i;
        return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
        function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
        function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
    }

    function __makeTemplateObject(cooked, raw) {
        if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
        return cooked;
    }
    function __importStar(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
        result.default = mod;
        return result;
    }

    function __importDefault(mod) {
        return (mod && mod.__esModule) ? mod : { default: mod };
    }

    var tslib_es6 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        __extends: __extends,
        get __assign () { return __assign; },
        __rest: __rest,
        __decorate: __decorate,
        __param: __param,
        __metadata: __metadata,
        __awaiter: __awaiter,
        __generator: __generator,
        __exportStar: __exportStar,
        __values: __values,
        __read: __read,
        __spread: __spread,
        __spreadArrays: __spreadArrays,
        __await: __await,
        __asyncGenerator: __asyncGenerator,
        __asyncDelegator: __asyncDelegator,
        __asyncValues: __asyncValues,
        __makeTemplateObject: __makeTemplateObject,
        __importStar: __importStar,
        __importDefault: __importDefault
    });

    var index_cjs = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, '__esModule', { value: true });



    /**
     * @license
     * Copyright 2017 Google Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * @fileoverview Firebase constants.  Some of these (@defines) can be overridden at compile-time.
     */
    var CONSTANTS = {
        /**
         * @define {boolean} Whether this is the client Node.js SDK.
         */
        NODE_CLIENT: false,
        /**
         * @define {boolean} Whether this is the Admin Node.js SDK.
         */
        NODE_ADMIN: false,
        /**
         * Firebase SDK Version
         */
        SDK_VERSION: '${JSCORE_VERSION}'
    };

    /**
     * @license
     * Copyright 2017 Google Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Throws an error if the provided assertion is falsy
     */
    var assert = function (assertion, message) {
        if (!assertion) {
            throw assertionError(message);
        }
    };
    /**
     * Returns an Error object suitable for throwing.
     */
    var assertionError = function (message) {
        return new Error('Firebase Database (' +
            CONSTANTS.SDK_VERSION +
            ') INTERNAL ASSERT FAILED: ' +
            message);
    };

    /**
     * @license
     * Copyright 2017 Google Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var stringToByteArray = function (str) {
        // TODO(user): Use native implementations if/when available
        var out = [];
        var p = 0;
        for (var i = 0; i < str.length; i++) {
            var c = str.charCodeAt(i);
            if (c < 128) {
                out[p++] = c;
            }
            else if (c < 2048) {
                out[p++] = (c >> 6) | 192;
                out[p++] = (c & 63) | 128;
            }
            else if ((c & 0xfc00) === 0xd800 &&
                i + 1 < str.length &&
                (str.charCodeAt(i + 1) & 0xfc00) === 0xdc00) {
                // Surrogate Pair
                c = 0x10000 + ((c & 0x03ff) << 10) + (str.charCodeAt(++i) & 0x03ff);
                out[p++] = (c >> 18) | 240;
                out[p++] = ((c >> 12) & 63) | 128;
                out[p++] = ((c >> 6) & 63) | 128;
                out[p++] = (c & 63) | 128;
            }
            else {
                out[p++] = (c >> 12) | 224;
                out[p++] = ((c >> 6) & 63) | 128;
                out[p++] = (c & 63) | 128;
            }
        }
        return out;
    };
    /**
     * Turns an array of numbers into the string given by the concatenation of the
     * characters to which the numbers correspond.
     * @param bytes Array of numbers representing characters.
     * @return Stringification of the array.
     */
    var byteArrayToString = function (bytes) {
        // TODO(user): Use native implementations if/when available
        var out = [];
        var pos = 0, c = 0;
        while (pos < bytes.length) {
            var c1 = bytes[pos++];
            if (c1 < 128) {
                out[c++] = String.fromCharCode(c1);
            }
            else if (c1 > 191 && c1 < 224) {
                var c2 = bytes[pos++];
                out[c++] = String.fromCharCode(((c1 & 31) << 6) | (c2 & 63));
            }
            else if (c1 > 239 && c1 < 365) {
                // Surrogate Pair
                var c2 = bytes[pos++];
                var c3 = bytes[pos++];
                var c4 = bytes[pos++];
                var u = (((c1 & 7) << 18) | ((c2 & 63) << 12) | ((c3 & 63) << 6) | (c4 & 63)) -
                    0x10000;
                out[c++] = String.fromCharCode(0xd800 + (u >> 10));
                out[c++] = String.fromCharCode(0xdc00 + (u & 1023));
            }
            else {
                var c2 = bytes[pos++];
                var c3 = bytes[pos++];
                out[c++] = String.fromCharCode(((c1 & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
            }
        }
        return out.join('');
    };
    // We define it as an object literal instead of a class because a class compiled down to es5 can't
    // be treeshaked. https://github.com/rollup/rollup/issues/1691
    // Static lookup maps, lazily populated by init_()
    var base64 = {
        /**
         * Maps bytes to characters.
         */
        byteToCharMap_: null,
        /**
         * Maps characters to bytes.
         */
        charToByteMap_: null,
        /**
         * Maps bytes to websafe characters.
         * @private
         */
        byteToCharMapWebSafe_: null,
        /**
         * Maps websafe characters to bytes.
         * @private
         */
        charToByteMapWebSafe_: null,
        /**
         * Our default alphabet, shared between
         * ENCODED_VALS and ENCODED_VALS_WEBSAFE
         */
        ENCODED_VALS_BASE: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + 'abcdefghijklmnopqrstuvwxyz' + '0123456789',
        /**
         * Our default alphabet. Value 64 (=) is special; it means "nothing."
         */
        get ENCODED_VALS() {
            return this.ENCODED_VALS_BASE + '+/=';
        },
        /**
         * Our websafe alphabet.
         */
        get ENCODED_VALS_WEBSAFE() {
            return this.ENCODED_VALS_BASE + '-_.';
        },
        /**
         * Whether this browser supports the atob and btoa functions. This extension
         * started at Mozilla but is now implemented by many browsers. We use the
         * ASSUME_* variables to avoid pulling in the full useragent detection library
         * but still allowing the standard per-browser compilations.
         *
         */
        HAS_NATIVE_SUPPORT: typeof atob === 'function',
        /**
         * Base64-encode an array of bytes.
         *
         * @param input An array of bytes (numbers with
         *     value in [0, 255]) to encode.
         * @param webSafe Boolean indicating we should use the
         *     alternative alphabet.
         * @return The base64 encoded string.
         */
        encodeByteArray: function (input, webSafe) {
            if (!Array.isArray(input)) {
                throw Error('encodeByteArray takes an array as a parameter');
            }
            this.init_();
            var byteToCharMap = webSafe
                ? this.byteToCharMapWebSafe_
                : this.byteToCharMap_;
            var output = [];
            for (var i = 0; i < input.length; i += 3) {
                var byte1 = input[i];
                var haveByte2 = i + 1 < input.length;
                var byte2 = haveByte2 ? input[i + 1] : 0;
                var haveByte3 = i + 2 < input.length;
                var byte3 = haveByte3 ? input[i + 2] : 0;
                var outByte1 = byte1 >> 2;
                var outByte2 = ((byte1 & 0x03) << 4) | (byte2 >> 4);
                var outByte3 = ((byte2 & 0x0f) << 2) | (byte3 >> 6);
                var outByte4 = byte3 & 0x3f;
                if (!haveByte3) {
                    outByte4 = 64;
                    if (!haveByte2) {
                        outByte3 = 64;
                    }
                }
                output.push(byteToCharMap[outByte1], byteToCharMap[outByte2], byteToCharMap[outByte3], byteToCharMap[outByte4]);
            }
            return output.join('');
        },
        /**
         * Base64-encode a string.
         *
         * @param input A string to encode.
         * @param webSafe If true, we should use the
         *     alternative alphabet.
         * @return The base64 encoded string.
         */
        encodeString: function (input, webSafe) {
            // Shortcut for Mozilla browsers that implement
            // a native base64 encoder in the form of "btoa/atob"
            if (this.HAS_NATIVE_SUPPORT && !webSafe) {
                return btoa(input);
            }
            return this.encodeByteArray(stringToByteArray(input), webSafe);
        },
        /**
         * Base64-decode a string.
         *
         * @param input to decode.
         * @param webSafe True if we should use the
         *     alternative alphabet.
         * @return string representing the decoded value.
         */
        decodeString: function (input, webSafe) {
            // Shortcut for Mozilla browsers that implement
            // a native base64 encoder in the form of "btoa/atob"
            if (this.HAS_NATIVE_SUPPORT && !webSafe) {
                return atob(input);
            }
            return byteArrayToString(this.decodeStringToByteArray(input, webSafe));
        },
        /**
         * Base64-decode a string.
         *
         * In base-64 decoding, groups of four characters are converted into three
         * bytes.  If the encoder did not apply padding, the input length may not
         * be a multiple of 4.
         *
         * In this case, the last group will have fewer than 4 characters, and
         * padding will be inferred.  If the group has one or two characters, it decodes
         * to one byte.  If the group has three characters, it decodes to two bytes.
         *
         * @param input Input to decode.
         * @param webSafe True if we should use the web-safe alphabet.
         * @return bytes representing the decoded value.
         */
        decodeStringToByteArray: function (input, webSafe) {
            this.init_();
            var charToByteMap = webSafe
                ? this.charToByteMapWebSafe_
                : this.charToByteMap_;
            var output = [];
            for (var i = 0; i < input.length;) {
                var byte1 = charToByteMap[input.charAt(i++)];
                var haveByte2 = i < input.length;
                var byte2 = haveByte2 ? charToByteMap[input.charAt(i)] : 0;
                ++i;
                var haveByte3 = i < input.length;
                var byte3 = haveByte3 ? charToByteMap[input.charAt(i)] : 64;
                ++i;
                var haveByte4 = i < input.length;
                var byte4 = haveByte4 ? charToByteMap[input.charAt(i)] : 64;
                ++i;
                if (byte1 == null || byte2 == null || byte3 == null || byte4 == null) {
                    throw Error();
                }
                var outByte1 = (byte1 << 2) | (byte2 >> 4);
                output.push(outByte1);
                if (byte3 !== 64) {
                    var outByte2 = ((byte2 << 4) & 0xf0) | (byte3 >> 2);
                    output.push(outByte2);
                    if (byte4 !== 64) {
                        var outByte3 = ((byte3 << 6) & 0xc0) | byte4;
                        output.push(outByte3);
                    }
                }
            }
            return output;
        },
        /**
         * Lazy static initialization function. Called before
         * accessing any of the static map variables.
         * @private
         */
        init_: function () {
            if (!this.byteToCharMap_) {
                this.byteToCharMap_ = {};
                this.charToByteMap_ = {};
                this.byteToCharMapWebSafe_ = {};
                this.charToByteMapWebSafe_ = {};
                // We want quick mappings back and forth, so we precompute two maps.
                for (var i = 0; i < this.ENCODED_VALS.length; i++) {
                    this.byteToCharMap_[i] = this.ENCODED_VALS.charAt(i);
                    this.charToByteMap_[this.byteToCharMap_[i]] = i;
                    this.byteToCharMapWebSafe_[i] = this.ENCODED_VALS_WEBSAFE.charAt(i);
                    this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[i]] = i;
                    // Be forgiving when decoding and correctly decode both encodings.
                    if (i >= this.ENCODED_VALS_BASE.length) {
                        this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(i)] = i;
                        this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(i)] = i;
                    }
                }
            }
        }
    };
    /**
     * URL-safe base64 encoding
     */
    var base64Encode = function (str) {
        var utf8Bytes = stringToByteArray(str);
        return base64.encodeByteArray(utf8Bytes, true);
    };
    /**
     * URL-safe base64 decoding
     *
     * NOTE: DO NOT use the global atob() function - it does NOT support the
     * base64Url variant encoding.
     *
     * @param str To be decoded
     * @return Decoded result, if possible
     */
    var base64Decode = function (str) {
        try {
            return base64.decodeString(str, true);
        }
        catch (e) {
            console.error('base64Decode failed: ', e);
        }
        return null;
    };

    /**
     * @license
     * Copyright 2017 Google Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Do a deep-copy of basic JavaScript Objects or Arrays.
     */
    function deepCopy(value) {
        return deepExtend(undefined, value);
    }
    /**
     * Copy properties from source to target (recursively allows extension
     * of Objects and Arrays).  Scalar values in the target are over-written.
     * If target is undefined, an object of the appropriate type will be created
     * (and returned).
     *
     * We recursively copy all child properties of plain Objects in the source- so
     * that namespace- like dictionaries are merged.
     *
     * Note that the target can be a function, in which case the properties in
     * the source Object are copied onto it as static properties of the Function.
     */
    function deepExtend(target, source) {
        if (!(source instanceof Object)) {
            return source;
        }
        switch (source.constructor) {
            case Date:
                // Treat Dates like scalars; if the target date object had any child
                // properties - they will be lost!
                var dateValue = source;
                return new Date(dateValue.getTime());
            case Object:
                if (target === undefined) {
                    target = {};
                }
                break;
            case Array:
                // Always copy the array source and overwrite the target.
                target = [];
                break;
            default:
                // Not a plain Object - treat it as a scalar.
                return source;
        }
        for (var prop in source) {
            if (!source.hasOwnProperty(prop)) {
                continue;
            }
            target[prop] = deepExtend(target[prop], source[prop]);
        }
        return target;
    }

    /**
     * @license
     * Copyright 2017 Google Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var Deferred = /** @class */ (function () {
        function Deferred() {
            var _this = this;
            this.reject = function () { };
            this.resolve = function () { };
            this.promise = new Promise(function (resolve, reject) {
                _this.resolve = resolve;
                _this.reject = reject;
            });
        }
        /**
         * Our API internals are not promiseified and cannot because our callback APIs have subtle expectations around
         * invoking promises inline, which Promises are forbidden to do. This method accepts an optional node-style callback
         * and returns a node-style callback which will resolve or reject the Deferred's promise.
         */
        Deferred.prototype.wrapCallback = function (callback) {
            var _this = this;
            return function (error, value) {
                if (error) {
                    _this.reject(error);
                }
                else {
                    _this.resolve(value);
                }
                if (typeof callback === 'function') {
                    // Attaching noop handler just in case developer wasn't expecting
                    // promises
                    _this.promise.catch(function () { });
                    // Some of our callbacks don't expect a value and our own tests
                    // assert that the parameter length is 1
                    if (callback.length === 1) {
                        callback(error);
                    }
                    else {
                        callback(error, value);
                    }
                }
            };
        };
        return Deferred;
    }());

    /**
     * @license
     * Copyright 2017 Google Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Returns navigator.userAgent string or '' if it's not defined.
     * @return user agent string
     */
    function getUA() {
        if (typeof navigator !== 'undefined' &&
            typeof navigator['userAgent'] === 'string') {
            return navigator['userAgent'];
        }
        else {
            return '';
        }
    }
    /**
     * Detect Cordova / PhoneGap / Ionic frameworks on a mobile device.
     *
     * Deliberately does not rely on checking `file://` URLs (as this fails PhoneGap
     * in the Ripple emulator) nor Cordova `onDeviceReady`, which would normally
     * wait for a callback.
     */
    function isMobileCordova() {
        return (typeof window !== 'undefined' &&
            // @ts-ignore Setting up an broadly applicable index signature for Window
            // just to deal with this case would probably be a bad idea.
            !!(window['cordova'] || window['phonegap'] || window['PhoneGap']) &&
            /ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(getUA()));
    }
    /**
     * Detect Node.js.
     *
     * @return true if Node.js environment is detected.
     */
    // Node detection logic from: https://github.com/iliakan/detect-node/
    function isNode() {
        try {
            return (Object.prototype.toString.call(commonjsGlobal.process) === '[object process]');
        }
        catch (e) {
            return false;
        }
    }
    /**
     * Detect Browser Environment
     */
    function isBrowser() {
        return typeof self === 'object' && self.self === self;
    }
    /**
     * Detect React Native.
     *
     * @return true if ReactNative environment is detected.
     */
    function isReactNative() {
        return (typeof navigator === 'object' && navigator['product'] === 'ReactNative');
    }
    /**
     * Detect whether the current SDK build is the Node version.
     *
     * @return true if it's the Node SDK build.
     */
    function isNodeSdk() {
        return CONSTANTS.NODE_CLIENT === true || CONSTANTS.NODE_ADMIN === true;
    }

    /**
     * @license
     * Copyright 2017 Google Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var ERROR_NAME = 'FirebaseError';
    // Based on code from:
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#Custom_Error_Types
    var FirebaseError = /** @class */ (function (_super) {
        tslib_es6.__extends(FirebaseError, _super);
        function FirebaseError(code, message) {
            var _this = _super.call(this, message) || this;
            _this.code = code;
            _this.name = ERROR_NAME;
            // Fix For ES5
            // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
            Object.setPrototypeOf(_this, FirebaseError.prototype);
            // Maintains proper stack trace for where our error was thrown.
            // Only available on V8.
            if (Error.captureStackTrace) {
                Error.captureStackTrace(_this, ErrorFactory.prototype.create);
            }
            return _this;
        }
        return FirebaseError;
    }(Error));
    var ErrorFactory = /** @class */ (function () {
        function ErrorFactory(service, serviceName, errors) {
            this.service = service;
            this.serviceName = serviceName;
            this.errors = errors;
        }
        ErrorFactory.prototype.create = function (code) {
            var data = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                data[_i - 1] = arguments[_i];
            }
            var customData = data[0] || {};
            var fullCode = this.service + "/" + code;
            var template = this.errors[code];
            var message = template ? replaceTemplate(template, customData) : 'Error';
            // Service Name: Error message (service/code).
            var fullMessage = this.serviceName + ": " + message + " (" + fullCode + ").";
            var error = new FirebaseError(fullCode, fullMessage);
            // Keys with an underscore at the end of their name are not included in
            // error.data for some reason.
            // TODO: Replace with Object.entries when lib is updated to es2017.
            for (var _a = 0, _b = Object.keys(customData); _a < _b.length; _a++) {
                var key = _b[_a];
                if (key.slice(-1) !== '_') {
                    if (key in error) {
                        console.warn("Overwriting FirebaseError base field \"" + key + "\" can cause unexpected behavior.");
                    }
                    error[key] = customData[key];
                }
            }
            return error;
        };
        return ErrorFactory;
    }());
    function replaceTemplate(template, data) {
        return template.replace(PATTERN, function (_, key) {
            var value = data[key];
            return value != null ? value.toString() : "<" + key + "?>";
        });
    }
    var PATTERN = /\{\$([^}]+)}/g;

    /**
     * @license
     * Copyright 2017 Google Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Evaluates a JSON string into a javascript object.
     *
     * @param {string} str A string containing JSON.
     * @return {*} The javascript object representing the specified JSON.
     */
    function jsonEval(str) {
        return JSON.parse(str);
    }
    /**
     * Returns JSON representing a javascript object.
     * @param {*} data Javascript object to be stringified.
     * @return {string} The JSON contents of the object.
     */
    function stringify(data) {
        return JSON.stringify(data);
    }

    /**
     * @license
     * Copyright 2017 Google Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Decodes a Firebase auth. token into constituent parts.
     *
     * Notes:
     * - May return with invalid / incomplete claims if there's no native base64 decoding support.
     * - Doesn't check if the token is actually valid.
     */
    var decode = function (token) {
        var header = {}, claims = {}, data = {}, signature = '';
        try {
            var parts = token.split('.');
            header = jsonEval(base64Decode(parts[0]) || '');
            claims = jsonEval(base64Decode(parts[1]) || '');
            signature = parts[2];
            data = claims['d'] || {};
            delete claims['d'];
        }
        catch (e) { }
        return {
            header: header,
            claims: claims,
            data: data,
            signature: signature
        };
    };
    /**
     * Decodes a Firebase auth. token and checks the validity of its time-based claims. Will return true if the
     * token is within the time window authorized by the 'nbf' (not-before) and 'iat' (issued-at) claims.
     *
     * Notes:
     * - May return a false negative if there's no native base64 decoding support.
     * - Doesn't check if the token is actually valid.
     */
    var isValidTimestamp = function (token) {
        var claims = decode(token).claims;
        var now = Math.floor(new Date().getTime() / 1000);
        var validSince = 0, validUntil = 0;
        if (typeof claims === 'object') {
            if (claims.hasOwnProperty('nbf')) {
                validSince = claims['nbf'];
            }
            else if (claims.hasOwnProperty('iat')) {
                validSince = claims['iat'];
            }
            if (claims.hasOwnProperty('exp')) {
                validUntil = claims['exp'];
            }
            else {
                // token will expire after 24h by default
                validUntil = validSince + 86400;
            }
        }
        return (!!now &&
            !!validSince &&
            !!validUntil &&
            now >= validSince &&
            now <= validUntil);
    };
    /**
     * Decodes a Firebase auth. token and returns its issued at time if valid, null otherwise.
     *
     * Notes:
     * - May return null if there's no native base64 decoding support.
     * - Doesn't check if the token is actually valid.
     */
    var issuedAtTime = function (token) {
        var claims = decode(token).claims;
        if (typeof claims === 'object' && claims.hasOwnProperty('iat')) {
            return claims['iat'];
        }
        return null;
    };
    /**
     * Decodes a Firebase auth. token and checks the validity of its format. Expects a valid issued-at time.
     *
     * Notes:
     * - May return a false negative if there's no native base64 decoding support.
     * - Doesn't check if the token is actually valid.
     */
    var isValidFormat = function (token) {
        var decoded = decode(token), claims = decoded.claims;
        return !!claims && typeof claims === 'object' && claims.hasOwnProperty('iat');
    };
    /**
     * Attempts to peer into an auth token and determine if it's an admin auth token by looking at the claims portion.
     *
     * Notes:
     * - May return a false negative if there's no native base64 decoding support.
     * - Doesn't check if the token is actually valid.
     */
    var isAdmin = function (token) {
        var claims = decode(token).claims;
        return typeof claims === 'object' && claims['admin'] === true;
    };

    /**
     * @license
     * Copyright 2017 Google Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function contains(obj, key) {
        return Object.prototype.hasOwnProperty.call(obj, key);
    }
    function safeGet(obj, key) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            return obj[key];
        }
        else {
            return undefined;
        }
    }
    function isEmpty(obj) {
        for (var key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                return false;
            }
        }
        return true;
    }
    function map(obj, fn, contextObj) {
        var res = {};
        for (var key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                res[key] = fn.call(contextObj, obj[key], key, obj);
            }
        }
        return res;
    }

    /**
     * @license
     * Copyright 2017 Google Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Returns a querystring-formatted string (e.g. &arg=val&arg2=val2) from a
     * params object (e.g. {arg: 'val', arg2: 'val2'})
     * Note: You must prepend it with ? when adding it to a URL.
     */
    function querystring(querystringParams) {
        var params = [];
        var _loop_1 = function (key, value) {
            if (Array.isArray(value)) {
                value.forEach(function (arrayVal) {
                    params.push(encodeURIComponent(key) + '=' + encodeURIComponent(arrayVal));
                });
            }
            else {
                params.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
            }
        };
        for (var _i = 0, _a = Object.entries(querystringParams); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], value = _b[1];
            _loop_1(key, value);
        }
        return params.length ? '&' + params.join('&') : '';
    }
    /**
     * Decodes a querystring (e.g. ?arg=val&arg2=val2) into a params object
     * (e.g. {arg: 'val', arg2: 'val2'})
     */
    function querystringDecode(querystring) {
        var obj = {};
        var tokens = querystring.replace(/^\?/, '').split('&');
        tokens.forEach(function (token) {
            if (token) {
                var key = token.split('=');
                obj[key[0]] = key[1];
            }
        });
        return obj;
    }

    /**
     * @license
     * Copyright 2017 Google Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * @fileoverview SHA-1 cryptographic hash.
     * Variable names follow the notation in FIPS PUB 180-3:
     * http://csrc.nist.gov/publications/fips/fips180-3/fips180-3_final.pdf.
     *
     * Usage:
     *   var sha1 = new sha1();
     *   sha1.update(bytes);
     *   var hash = sha1.digest();
     *
     * Performance:
     *   Chrome 23:   ~400 Mbit/s
     *   Firefox 16:  ~250 Mbit/s
     *
     */
    /**
     * SHA-1 cryptographic hash constructor.
     *
     * The properties declared here are discussed in the above algorithm document.
     * @constructor
     * @final
     * @struct
     */
    var Sha1 = /** @class */ (function () {
        function Sha1() {
            /**
             * Holds the previous values of accumulated variables a-e in the compress_
             * function.
             * @private
             */
            this.chain_ = [];
            /**
             * A buffer holding the partially computed hash result.
             * @private
             */
            this.buf_ = [];
            /**
             * An array of 80 bytes, each a part of the message to be hashed.  Referred to
             * as the message schedule in the docs.
             * @private
             */
            this.W_ = [];
            /**
             * Contains data needed to pad messages less than 64 bytes.
             * @private
             */
            this.pad_ = [];
            /**
             * @private {number}
             */
            this.inbuf_ = 0;
            /**
             * @private {number}
             */
            this.total_ = 0;
            this.blockSize = 512 / 8;
            this.pad_[0] = 128;
            for (var i = 1; i < this.blockSize; ++i) {
                this.pad_[i] = 0;
            }
            this.reset();
        }
        Sha1.prototype.reset = function () {
            this.chain_[0] = 0x67452301;
            this.chain_[1] = 0xefcdab89;
            this.chain_[2] = 0x98badcfe;
            this.chain_[3] = 0x10325476;
            this.chain_[4] = 0xc3d2e1f0;
            this.inbuf_ = 0;
            this.total_ = 0;
        };
        /**
         * Internal compress helper function.
         * @param buf Block to compress.
         * @param offset Offset of the block in the buffer.
         * @private
         */
        Sha1.prototype.compress_ = function (buf, offset) {
            if (!offset) {
                offset = 0;
            }
            var W = this.W_;
            // get 16 big endian words
            if (typeof buf === 'string') {
                for (var i = 0; i < 16; i++) {
                    // TODO(user): [bug 8140122] Recent versions of Safari for Mac OS and iOS
                    // have a bug that turns the post-increment ++ operator into pre-increment
                    // during JIT compilation.  We have code that depends heavily on SHA-1 for
                    // correctness and which is affected by this bug, so I've removed all uses
                    // of post-increment ++ in which the result value is used.  We can revert
                    // this change once the Safari bug
                    // (https://bugs.webkit.org/show_bug.cgi?id=109036) has been fixed and
                    // most clients have been updated.
                    W[i] =
                        (buf.charCodeAt(offset) << 24) |
                            (buf.charCodeAt(offset + 1) << 16) |
                            (buf.charCodeAt(offset + 2) << 8) |
                            buf.charCodeAt(offset + 3);
                    offset += 4;
                }
            }
            else {
                for (var i = 0; i < 16; i++) {
                    W[i] =
                        (buf[offset] << 24) |
                            (buf[offset + 1] << 16) |
                            (buf[offset + 2] << 8) |
                            buf[offset + 3];
                    offset += 4;
                }
            }
            // expand to 80 words
            for (var i = 16; i < 80; i++) {
                var t = W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16];
                W[i] = ((t << 1) | (t >>> 31)) & 0xffffffff;
            }
            var a = this.chain_[0];
            var b = this.chain_[1];
            var c = this.chain_[2];
            var d = this.chain_[3];
            var e = this.chain_[4];
            var f, k;
            // TODO(user): Try to unroll this loop to speed up the computation.
            for (var i = 0; i < 80; i++) {
                if (i < 40) {
                    if (i < 20) {
                        f = d ^ (b & (c ^ d));
                        k = 0x5a827999;
                    }
                    else {
                        f = b ^ c ^ d;
                        k = 0x6ed9eba1;
                    }
                }
                else {
                    if (i < 60) {
                        f = (b & c) | (d & (b | c));
                        k = 0x8f1bbcdc;
                    }
                    else {
                        f = b ^ c ^ d;
                        k = 0xca62c1d6;
                    }
                }
                var t = (((a << 5) | (a >>> 27)) + f + e + k + W[i]) & 0xffffffff;
                e = d;
                d = c;
                c = ((b << 30) | (b >>> 2)) & 0xffffffff;
                b = a;
                a = t;
            }
            this.chain_[0] = (this.chain_[0] + a) & 0xffffffff;
            this.chain_[1] = (this.chain_[1] + b) & 0xffffffff;
            this.chain_[2] = (this.chain_[2] + c) & 0xffffffff;
            this.chain_[3] = (this.chain_[3] + d) & 0xffffffff;
            this.chain_[4] = (this.chain_[4] + e) & 0xffffffff;
        };
        Sha1.prototype.update = function (bytes, length) {
            // TODO(johnlenz): tighten the function signature and remove this check
            if (bytes == null) {
                return;
            }
            if (length === undefined) {
                length = bytes.length;
            }
            var lengthMinusBlock = length - this.blockSize;
            var n = 0;
            // Using local instead of member variables gives ~5% speedup on Firefox 16.
            var buf = this.buf_;
            var inbuf = this.inbuf_;
            // The outer while loop should execute at most twice.
            while (n < length) {
                // When we have no data in the block to top up, we can directly process the
                // input buffer (assuming it contains sufficient data). This gives ~25%
                // speedup on Chrome 23 and ~15% speedup on Firefox 16, but requires that
                // the data is provided in large chunks (or in multiples of 64 bytes).
                if (inbuf === 0) {
                    while (n <= lengthMinusBlock) {
                        this.compress_(bytes, n);
                        n += this.blockSize;
                    }
                }
                if (typeof bytes === 'string') {
                    while (n < length) {
                        buf[inbuf] = bytes.charCodeAt(n);
                        ++inbuf;
                        ++n;
                        if (inbuf === this.blockSize) {
                            this.compress_(buf);
                            inbuf = 0;
                            // Jump to the outer loop so we use the full-block optimization.
                            break;
                        }
                    }
                }
                else {
                    while (n < length) {
                        buf[inbuf] = bytes[n];
                        ++inbuf;
                        ++n;
                        if (inbuf === this.blockSize) {
                            this.compress_(buf);
                            inbuf = 0;
                            // Jump to the outer loop so we use the full-block optimization.
                            break;
                        }
                    }
                }
            }
            this.inbuf_ = inbuf;
            this.total_ += length;
        };
        /** @override */
        Sha1.prototype.digest = function () {
            var digest = [];
            var totalBits = this.total_ * 8;
            // Add pad 0x80 0x00*.
            if (this.inbuf_ < 56) {
                this.update(this.pad_, 56 - this.inbuf_);
            }
            else {
                this.update(this.pad_, this.blockSize - (this.inbuf_ - 56));
            }
            // Add # bits.
            for (var i = this.blockSize - 1; i >= 56; i--) {
                this.buf_[i] = totalBits & 255;
                totalBits /= 256; // Don't use bit-shifting here!
            }
            this.compress_(this.buf_);
            var n = 0;
            for (var i = 0; i < 5; i++) {
                for (var j = 24; j >= 0; j -= 8) {
                    digest[n] = (this.chain_[i] >> j) & 255;
                    ++n;
                }
            }
            return digest;
        };
        return Sha1;
    }());

    /**
     * Helper to make a Subscribe function (just like Promise helps make a
     * Thenable).
     *
     * @param executor Function which can make calls to a single Observer
     *     as a proxy.
     * @param onNoObservers Callback when count of Observers goes to zero.
     */
    function createSubscribe(executor, onNoObservers) {
        var proxy = new ObserverProxy(executor, onNoObservers);
        return proxy.subscribe.bind(proxy);
    }
    /**
     * Implement fan-out for any number of Observers attached via a subscribe
     * function.
     */
    var ObserverProxy = /** @class */ (function () {
        /**
         * @param executor Function which can make calls to a single Observer
         *     as a proxy.
         * @param onNoObservers Callback when count of Observers goes to zero.
         */
        function ObserverProxy(executor, onNoObservers) {
            var _this = this;
            this.observers = [];
            this.unsubscribes = [];
            this.observerCount = 0;
            // Micro-task scheduling by calling task.then().
            this.task = Promise.resolve();
            this.finalized = false;
            this.onNoObservers = onNoObservers;
            // Call the executor asynchronously so subscribers that are called
            // synchronously after the creation of the subscribe function
            // can still receive the very first value generated in the executor.
            this.task
                .then(function () {
                executor(_this);
            })
                .catch(function (e) {
                _this.error(e);
            });
        }
        ObserverProxy.prototype.next = function (value) {
            this.forEachObserver(function (observer) {
                observer.next(value);
            });
        };
        ObserverProxy.prototype.error = function (error) {
            this.forEachObserver(function (observer) {
                observer.error(error);
            });
            this.close(error);
        };
        ObserverProxy.prototype.complete = function () {
            this.forEachObserver(function (observer) {
                observer.complete();
            });
            this.close();
        };
        /**
         * Subscribe function that can be used to add an Observer to the fan-out list.
         *
         * - We require that no event is sent to a subscriber sychronously to their
         *   call to subscribe().
         */
        ObserverProxy.prototype.subscribe = function (nextOrObserver, error, complete) {
            var _this = this;
            var observer;
            if (nextOrObserver === undefined &&
                error === undefined &&
                complete === undefined) {
                throw new Error('Missing Observer.');
            }
            // Assemble an Observer object when passed as callback functions.
            if (implementsAnyMethods(nextOrObserver, [
                'next',
                'error',
                'complete'
            ])) {
                observer = nextOrObserver;
            }
            else {
                observer = {
                    next: nextOrObserver,
                    error: error,
                    complete: complete
                };
            }
            if (observer.next === undefined) {
                observer.next = noop;
            }
            if (observer.error === undefined) {
                observer.error = noop;
            }
            if (observer.complete === undefined) {
                observer.complete = noop;
            }
            var unsub = this.unsubscribeOne.bind(this, this.observers.length);
            // Attempt to subscribe to a terminated Observable - we
            // just respond to the Observer with the final error or complete
            // event.
            if (this.finalized) {
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                this.task.then(function () {
                    try {
                        if (_this.finalError) {
                            observer.error(_this.finalError);
                        }
                        else {
                            observer.complete();
                        }
                    }
                    catch (e) {
                        // nothing
                    }
                    return;
                });
            }
            this.observers.push(observer);
            return unsub;
        };
        // Unsubscribe is synchronous - we guarantee that no events are sent to
        // any unsubscribed Observer.
        ObserverProxy.prototype.unsubscribeOne = function (i) {
            if (this.observers === undefined || this.observers[i] === undefined) {
                return;
            }
            delete this.observers[i];
            this.observerCount -= 1;
            if (this.observerCount === 0 && this.onNoObservers !== undefined) {
                this.onNoObservers(this);
            }
        };
        ObserverProxy.prototype.forEachObserver = function (fn) {
            if (this.finalized) {
                // Already closed by previous event....just eat the additional values.
                return;
            }
            // Since sendOne calls asynchronously - there is no chance that
            // this.observers will become undefined.
            for (var i = 0; i < this.observers.length; i++) {
                this.sendOne(i, fn);
            }
        };
        // Call the Observer via one of it's callback function. We are careful to
        // confirm that the observe has not been unsubscribed since this asynchronous
        // function had been queued.
        ObserverProxy.prototype.sendOne = function (i, fn) {
            var _this = this;
            // Execute the callback asynchronously
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.task.then(function () {
                if (_this.observers !== undefined && _this.observers[i] !== undefined) {
                    try {
                        fn(_this.observers[i]);
                    }
                    catch (e) {
                        // Ignore exceptions raised in Observers or missing methods of an
                        // Observer.
                        // Log error to console. b/31404806
                        if (typeof console !== 'undefined' && console.error) {
                            console.error(e);
                        }
                    }
                }
            });
        };
        ObserverProxy.prototype.close = function (err) {
            var _this = this;
            if (this.finalized) {
                return;
            }
            this.finalized = true;
            if (err !== undefined) {
                this.finalError = err;
            }
            // Proxy is no longer needed - garbage collect references
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.task.then(function () {
                _this.observers = undefined;
                _this.onNoObservers = undefined;
            });
        };
        return ObserverProxy;
    }());
    /** Turn synchronous function into one called asynchronously. */
    function async(fn, onError) {
        return function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            Promise.resolve(true)
                .then(function () {
                fn.apply(void 0, args);
            })
                .catch(function (error) {
                if (onError) {
                    onError(error);
                }
            });
        };
    }
    /**
     * Return true if the object passed in implements any of the named methods.
     */
    function implementsAnyMethods(obj, methods) {
        if (typeof obj !== 'object' || obj === null) {
            return false;
        }
        for (var _i = 0, methods_1 = methods; _i < methods_1.length; _i++) {
            var method = methods_1[_i];
            if (method in obj && typeof obj[method] === 'function') {
                return true;
            }
        }
        return false;
    }
    function noop() {
        // do nothing
    }

    /**
     * @license
     * Copyright 2017 Google Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Check to make sure the appropriate number of arguments are provided for a public function.
     * Throws an error if it fails.
     *
     * @param fnName The function name
     * @param minCount The minimum number of arguments to allow for the function call
     * @param maxCount The maximum number of argument to allow for the function call
     * @param argCount The actual number of arguments provided.
     */
    var validateArgCount = function (fnName, minCount, maxCount, argCount) {
        var argError;
        if (argCount < minCount) {
            argError = 'at least ' + minCount;
        }
        else if (argCount > maxCount) {
            argError = maxCount === 0 ? 'none' : 'no more than ' + maxCount;
        }
        if (argError) {
            var error = fnName +
                ' failed: Was called with ' +
                argCount +
                (argCount === 1 ? ' argument.' : ' arguments.') +
                ' Expects ' +
                argError +
                '.';
            throw new Error(error);
        }
    };
    /**
     * Generates a string to prefix an error message about failed argument validation
     *
     * @param fnName The function name
     * @param argumentNumber The index of the argument
     * @param optional Whether or not the argument is optional
     * @return The prefix to add to the error thrown for validation.
     */
    function errorPrefix(fnName, argumentNumber, optional) {
        var argName = '';
        switch (argumentNumber) {
            case 1:
                argName = optional ? 'first' : 'First';
                break;
            case 2:
                argName = optional ? 'second' : 'Second';
                break;
            case 3:
                argName = optional ? 'third' : 'Third';
                break;
            case 4:
                argName = optional ? 'fourth' : 'Fourth';
                break;
            default:
                throw new Error('errorPrefix called with argumentNumber > 4.  Need to update it?');
        }
        var error = fnName + ' failed: ';
        error += argName + ' argument ';
        return error;
    }
    /**
     * @param fnName
     * @param argumentNumber
     * @param namespace
     * @param optional
     */
    function validateNamespace(fnName, argumentNumber, namespace, optional) {
        if (optional && !namespace) {
            return;
        }
        if (typeof namespace !== 'string') {
            //TODO: I should do more validation here. We only allow certain chars in namespaces.
            throw new Error(errorPrefix(fnName, argumentNumber, optional) +
                'must be a valid firebase namespace.');
        }
    }
    function validateCallback(fnName, argumentNumber, callback, optional) {
        if (optional && !callback) {
            return;
        }
        if (typeof callback !== 'function') {
            throw new Error(errorPrefix(fnName, argumentNumber, optional) +
                'must be a valid function.');
        }
    }
    function validateContextObject(fnName, argumentNumber, context, optional) {
        if (optional && !context) {
            return;
        }
        if (typeof context !== 'object' || context === null) {
            throw new Error(errorPrefix(fnName, argumentNumber, optional) +
                'must be a valid context object.');
        }
    }

    /**
     * @license
     * Copyright 2017 Google Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    // Code originally came from goog.crypt.stringToUtf8ByteArray, but for some reason they
    // automatically replaced '\r\n' with '\n', and they didn't handle surrogate pairs,
    // so it's been modified.
    // Note that not all Unicode characters appear as single characters in JavaScript strings.
    // fromCharCode returns the UTF-16 encoding of a character - so some Unicode characters
    // use 2 characters in Javascript.  All 4-byte UTF-8 characters begin with a first
    // character in the range 0xD800 - 0xDBFF (the first character of a so-called surrogate
    // pair).
    // See http://www.ecma-international.org/ecma-262/5.1/#sec-15.1.3
    /**
     * @param {string} str
     * @return {Array}
     */
    var stringToByteArray$1 = function (str) {
        var out = [];
        var p = 0;
        for (var i = 0; i < str.length; i++) {
            var c = str.charCodeAt(i);
            // Is this the lead surrogate in a surrogate pair?
            if (c >= 0xd800 && c <= 0xdbff) {
                var high = c - 0xd800; // the high 10 bits.
                i++;
                assert(i < str.length, 'Surrogate pair missing trail surrogate.');
                var low = str.charCodeAt(i) - 0xdc00; // the low 10 bits.
                c = 0x10000 + (high << 10) + low;
            }
            if (c < 128) {
                out[p++] = c;
            }
            else if (c < 2048) {
                out[p++] = (c >> 6) | 192;
                out[p++] = (c & 63) | 128;
            }
            else if (c < 65536) {
                out[p++] = (c >> 12) | 224;
                out[p++] = ((c >> 6) & 63) | 128;
                out[p++] = (c & 63) | 128;
            }
            else {
                out[p++] = (c >> 18) | 240;
                out[p++] = ((c >> 12) & 63) | 128;
                out[p++] = ((c >> 6) & 63) | 128;
                out[p++] = (c & 63) | 128;
            }
        }
        return out;
    };
    /**
     * Calculate length without actually converting; useful for doing cheaper validation.
     * @param {string} str
     * @return {number}
     */
    var stringLength = function (str) {
        var p = 0;
        for (var i = 0; i < str.length; i++) {
            var c = str.charCodeAt(i);
            if (c < 128) {
                p++;
            }
            else if (c < 2048) {
                p += 2;
            }
            else if (c >= 0xd800 && c <= 0xdbff) {
                // Lead surrogate of a surrogate pair.  The pair together will take 4 bytes to represent.
                p += 4;
                i++; // skip trail surrogate.
            }
            else {
                p += 3;
            }
        }
        return p;
    };

    exports.CONSTANTS = CONSTANTS;
    exports.Deferred = Deferred;
    exports.ErrorFactory = ErrorFactory;
    exports.FirebaseError = FirebaseError;
    exports.Sha1 = Sha1;
    exports.assert = assert;
    exports.assertionError = assertionError;
    exports.async = async;
    exports.base64 = base64;
    exports.base64Decode = base64Decode;
    exports.base64Encode = base64Encode;
    exports.contains = contains;
    exports.createSubscribe = createSubscribe;
    exports.decode = decode;
    exports.deepCopy = deepCopy;
    exports.deepExtend = deepExtend;
    exports.errorPrefix = errorPrefix;
    exports.getUA = getUA;
    exports.isAdmin = isAdmin;
    exports.isBrowser = isBrowser;
    exports.isEmpty = isEmpty;
    exports.isMobileCordova = isMobileCordova;
    exports.isNode = isNode;
    exports.isNodeSdk = isNodeSdk;
    exports.isReactNative = isReactNative;
    exports.isValidFormat = isValidFormat;
    exports.isValidTimestamp = isValidTimestamp;
    exports.issuedAtTime = issuedAtTime;
    exports.jsonEval = jsonEval;
    exports.map = map;
    exports.querystring = querystring;
    exports.querystringDecode = querystringDecode;
    exports.safeGet = safeGet;
    exports.stringLength = stringLength;
    exports.stringToByteArray = stringToByteArray$1;
    exports.stringify = stringify;
    exports.validateArgCount = validateArgCount;
    exports.validateCallback = validateCallback;
    exports.validateContextObject = validateContextObject;
    exports.validateNamespace = validateNamespace;

    });

    unwrapExports(index_cjs);
    var index_cjs_1 = index_cjs.CONSTANTS;
    var index_cjs_2 = index_cjs.Deferred;
    var index_cjs_3 = index_cjs.ErrorFactory;
    var index_cjs_4 = index_cjs.FirebaseError;
    var index_cjs_5 = index_cjs.Sha1;
    var index_cjs_6 = index_cjs.assert;
    var index_cjs_7 = index_cjs.assertionError;
    var index_cjs_8 = index_cjs.async;
    var index_cjs_9 = index_cjs.base64;
    var index_cjs_10 = index_cjs.base64Decode;
    var index_cjs_11 = index_cjs.base64Encode;
    var index_cjs_12 = index_cjs.contains;
    var index_cjs_13 = index_cjs.createSubscribe;
    var index_cjs_14 = index_cjs.decode;
    var index_cjs_15 = index_cjs.deepCopy;
    var index_cjs_16 = index_cjs.deepExtend;
    var index_cjs_17 = index_cjs.errorPrefix;
    var index_cjs_18 = index_cjs.getUA;
    var index_cjs_19 = index_cjs.isAdmin;
    var index_cjs_20 = index_cjs.isBrowser;
    var index_cjs_21 = index_cjs.isEmpty;
    var index_cjs_22 = index_cjs.isMobileCordova;
    var index_cjs_23 = index_cjs.isNode;
    var index_cjs_24 = index_cjs.isNodeSdk;
    var index_cjs_25 = index_cjs.isReactNative;
    var index_cjs_26 = index_cjs.isValidFormat;
    var index_cjs_27 = index_cjs.isValidTimestamp;
    var index_cjs_28 = index_cjs.issuedAtTime;
    var index_cjs_29 = index_cjs.jsonEval;
    var index_cjs_30 = index_cjs.map;
    var index_cjs_31 = index_cjs.querystring;
    var index_cjs_32 = index_cjs.querystringDecode;
    var index_cjs_33 = index_cjs.safeGet;
    var index_cjs_34 = index_cjs.stringLength;
    var index_cjs_35 = index_cjs.stringToByteArray;
    var index_cjs_36 = index_cjs.stringify;
    var index_cjs_37 = index_cjs.validateArgCount;
    var index_cjs_38 = index_cjs.validateCallback;
    var index_cjs_39 = index_cjs.validateContextObject;
    var index_cjs_40 = index_cjs.validateNamespace;

    var index_cjs$1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, '__esModule', { value: true });




    /**
     * Component for service name T, e.g. `auth`, `auth-internal`
     */
    var Component = /** @class */ (function () {
        /**
         *
         * @param name The public service name, e.g. app, auth, firestore, database
         * @param instanceFactory Service factory responsible for creating the public interface
         * @param type whehter the service provided by the component is public or private
         */
        function Component(name, instanceFactory, type) {
            this.name = name;
            this.instanceFactory = instanceFactory;
            this.type = type;
            this.multipleInstances = false;
            /**
             * Properties to be added to the service namespace
             */
            this.serviceProps = {};
            this.instantiationMode = "LAZY" /* LAZY */;
        }
        Component.prototype.setInstantiationMode = function (mode) {
            this.instantiationMode = mode;
            return this;
        };
        Component.prototype.setMultipleInstances = function (multipleInstances) {
            this.multipleInstances = multipleInstances;
            return this;
        };
        Component.prototype.setServiceProps = function (props) {
            this.serviceProps = props;
            return this;
        };
        return Component;
    }());

    /**
     * @license
     * Copyright 2019 Google Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var DEFAULT_ENTRY_NAME = '[DEFAULT]';

    /**
     * @license
     * Copyright 2019 Google Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Provider for instance for service name T, e.g. 'auth', 'auth-internal'
     * NameServiceMapping[T] is an alias for the type of the instance
     */
    var Provider = /** @class */ (function () {
        function Provider(name, container) {
            this.name = name;
            this.container = container;
            this.component = null;
            this.instances = new Map();
            this.instancesDeferred = new Map();
        }
        /**
         * @param identifier A provider can provide mulitple instances of a service
         * if this.component.multipleInstances is true.
         */
        Provider.prototype.get = function (identifier) {
            if (identifier === void 0) { identifier = DEFAULT_ENTRY_NAME; }
            // if multipleInstances is not supported, use the default name
            var normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
            if (!this.instancesDeferred.has(normalizedIdentifier)) {
                var deferred = new index_cjs.Deferred();
                this.instancesDeferred.set(normalizedIdentifier, deferred);
                // If the service instance is available, resolve the promise with it immediately
                try {
                    var instance = this.getOrInitializeService(normalizedIdentifier);
                    if (instance) {
                        deferred.resolve(instance);
                    }
                }
                catch (e) {
                    // when the instance factory throws an exception during get(), it should not cause
                    // a fatal error. We just return the unresolved promise in this case.
                }
            }
            return this.instancesDeferred.get(normalizedIdentifier).promise;
        };
        Provider.prototype.getImmediate = function (options) {
            var _a = tslib_es6.__assign({ identifier: DEFAULT_ENTRY_NAME, optional: false }, options), identifier = _a.identifier, optional = _a.optional;
            // if multipleInstances is not supported, use the default name
            var normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
            try {
                var instance = this.getOrInitializeService(normalizedIdentifier);
                if (!instance) {
                    if (optional) {
                        return null;
                    }
                    throw Error("Service " + this.name + " is not available");
                }
                return instance;
            }
            catch (e) {
                if (optional) {
                    return null;
                }
                else {
                    throw e;
                }
            }
        };
        Provider.prototype.getComponent = function () {
            return this.component;
        };
        Provider.prototype.setComponent = function (component) {
            var e_1, _a;
            if (component.name !== this.name) {
                throw Error("Mismatching Component " + component.name + " for Provider " + this.name + ".");
            }
            if (this.component) {
                throw Error("Component for " + this.name + " has already been provided");
            }
            this.component = component;
            // if the service is eager, initialize the default instance
            if (isComponentEager(component)) {
                try {
                    this.getOrInitializeService(DEFAULT_ENTRY_NAME);
                }
                catch (e) {
                    // when the instance factory for an eager Component throws an exception during the eager
                    // initialization, it should not cause a fatal error.
                    // TODO: Investigate if we need to make it configurable, because some component may want to cause
                    // a fatal error in this case?
                }
            }
            try {
                // Create service instances for the pending promises and resolve them
                // NOTE: if this.multipleInstances is false, only the default instance will be created
                // and all promises with resolve with it regardless of the identifier.
                for (var _b = tslib_es6.__values(this.instancesDeferred.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var _d = tslib_es6.__read(_c.value, 2), instanceIdentifier = _d[0], instanceDeferred = _d[1];
                    var normalizedIdentifier = this.normalizeInstanceIdentifier(instanceIdentifier);
                    try {
                        // `getOrInitializeService()` should always return a valid instance since a component is guaranteed. use ! to make typescript happy.
                        var instance = this.getOrInitializeService(normalizedIdentifier);
                        instanceDeferred.resolve(instance);
                    }
                    catch (e) {
                        // when the instance factory throws an exception, it should not cause
                        // a fatal error. We just leave the promise unresolved.
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        };
        Provider.prototype.clearInstance = function (identifier) {
            if (identifier === void 0) { identifier = DEFAULT_ENTRY_NAME; }
            this.instancesDeferred.delete(identifier);
            this.instances.delete(identifier);
        };
        // app.delete() will call this method on every provider to delete the services
        // TODO: should we mark the provider as deleted?
        Provider.prototype.delete = function () {
            return tslib_es6.__awaiter(this, void 0, void 0, function () {
                var services;
                return tslib_es6.__generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            services = Array.from(this.instances.values());
                            return [4 /*yield*/, Promise.all(services
                                    .filter(function (service) { return 'INTERNAL' in service; })
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    .map(function (service) { return service.INTERNAL.delete(); }))];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        Provider.prototype.isComponentSet = function () {
            return this.component != null;
        };
        Provider.prototype.getOrInitializeService = function (identifier) {
            var instance = this.instances.get(identifier);
            if (!instance && this.component) {
                instance = this.component.instanceFactory(this.container, normalizeIdentifierForFactory(identifier));
                this.instances.set(identifier, instance);
            }
            return instance || null;
        };
        Provider.prototype.normalizeInstanceIdentifier = function (identifier) {
            if (this.component) {
                return this.component.multipleInstances ? identifier : DEFAULT_ENTRY_NAME;
            }
            else {
                return identifier; // assume multiple instances are supported before the component is provided.
            }
        };
        return Provider;
    }());
    // undefined should be passed to the service factory for the default instance
    function normalizeIdentifierForFactory(identifier) {
        return identifier === DEFAULT_ENTRY_NAME ? undefined : identifier;
    }
    function isComponentEager(component) {
        return component.instantiationMode === "EAGER" /* EAGER */;
    }

    /**
     * @license
     * Copyright 2019 Google Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * ComponentContainer that provides Providers for service name T, e.g. `auth`, `auth-internal`
     */
    var ComponentContainer = /** @class */ (function () {
        function ComponentContainer(name) {
            this.name = name;
            this.providers = new Map();
        }
        /**
         *
         * @param component Component being added
         * @param overwrite When a component with the same name has already been registered,
         * if overwrite is true: overwrite the existing component with the new component and create a new
         * provider with the new component. It can be useful in tests where you want to use different mocks
         * for different tests.
         * if overwrite is false: throw an exception
         */
        ComponentContainer.prototype.addComponent = function (component) {
            var provider = this.getProvider(component.name);
            if (provider.isComponentSet()) {
                throw new Error("Component " + component.name + " has already been registered with " + this.name);
            }
            provider.setComponent(component);
        };
        ComponentContainer.prototype.addOrOverwriteComponent = function (component) {
            var provider = this.getProvider(component.name);
            if (provider.isComponentSet()) {
                // delete the existing provider from the container, so we can register the new component
                this.providers.delete(component.name);
            }
            this.addComponent(component);
        };
        /**
         * getProvider provides a type safe interface where it can only be called with a field name
         * present in NameServiceMapping interface.
         *
         * Firebase SDKs providing services should extend NameServiceMapping interface to register
         * themselves.
         */
        ComponentContainer.prototype.getProvider = function (name) {
            if (this.providers.has(name)) {
                return this.providers.get(name);
            }
            // create a Provider for a service that hasn't registered with Firebase
            var provider = new Provider(name, this);
            this.providers.set(name, provider);
            return provider;
        };
        ComponentContainer.prototype.getProviders = function () {
            return Array.from(this.providers.values());
        };
        return ComponentContainer;
    }());

    exports.Component = Component;
    exports.ComponentContainer = ComponentContainer;
    exports.Provider = Provider;

    });

    unwrapExports(index_cjs$1);
    var index_cjs_1$1 = index_cjs$1.Component;
    var index_cjs_2$1 = index_cjs$1.ComponentContainer;
    var index_cjs_3$1 = index_cjs$1.Provider;

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */

    function __spreadArrays$1() {
        for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
        for (var r = Array(s), k = 0, i = 0; i < il; i++)
            for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
                r[k] = a[j];
        return r;
    }

    /**
     * @license
     * Copyright 2017 Google Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * A container for all of the Logger instances
     */
    var instances = [];
    /**
     * The JS SDK supports 5 log levels and also allows a user the ability to
     * silence the logs altogether.
     *
     * The order is a follows:
     * DEBUG < VERBOSE < INFO < WARN < ERROR
     *
     * All of the log types above the current log level will be captured (i.e. if
     * you set the log level to `INFO`, errors will still be logged, but `DEBUG` and
     * `VERBOSE` logs will not)
     */
    var LogLevel;
    (function (LogLevel) {
        LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
        LogLevel[LogLevel["VERBOSE"] = 1] = "VERBOSE";
        LogLevel[LogLevel["INFO"] = 2] = "INFO";
        LogLevel[LogLevel["WARN"] = 3] = "WARN";
        LogLevel[LogLevel["ERROR"] = 4] = "ERROR";
        LogLevel[LogLevel["SILENT"] = 5] = "SILENT";
    })(LogLevel || (LogLevel = {}));
    /**
     * The default log level
     */
    var defaultLogLevel = LogLevel.INFO;
    /**
     * The default log handler will forward DEBUG, VERBOSE, INFO, WARN, and ERROR
     * messages on to their corresponding console counterparts (if the log method
     * is supported by the current log level)
     */
    var defaultLogHandler = function (instance, logType) {
        var args = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args[_i - 2] = arguments[_i];
        }
        if (logType < instance.logLevel) {
            return;
        }
        var now = new Date().toISOString();
        switch (logType) {
            /**
             * By default, `console.debug` is not displayed in the developer console (in
             * chrome). To avoid forcing users to have to opt-in to these logs twice
             * (i.e. once for firebase, and once in the console), we are sending `DEBUG`
             * logs to the `console.log` function.
             */
            case LogLevel.DEBUG:
                console.log.apply(console, __spreadArrays$1(["[" + now + "]  " + instance.name + ":"], args));
                break;
            case LogLevel.VERBOSE:
                console.log.apply(console, __spreadArrays$1(["[" + now + "]  " + instance.name + ":"], args));
                break;
            case LogLevel.INFO:
                console.info.apply(console, __spreadArrays$1(["[" + now + "]  " + instance.name + ":"], args));
                break;
            case LogLevel.WARN:
                console.warn.apply(console, __spreadArrays$1(["[" + now + "]  " + instance.name + ":"], args));
                break;
            case LogLevel.ERROR:
                console.error.apply(console, __spreadArrays$1(["[" + now + "]  " + instance.name + ":"], args));
                break;
            default:
                throw new Error("Attempted to log a message with an invalid logType (value: " + logType + ")");
        }
    };
    var Logger = /** @class */ (function () {
        /**
         * Gives you an instance of a Logger to capture messages according to
         * Firebase's logging scheme.
         *
         * @param name The name that the logs will be associated with
         */
        function Logger(name) {
            this.name = name;
            /**
             * The log level of the given Logger instance.
             */
            this._logLevel = defaultLogLevel;
            /**
             * The log handler for the Logger instance.
             */
            this._logHandler = defaultLogHandler;
            /**
             * Capture the current instance for later use
             */
            instances.push(this);
        }
        Object.defineProperty(Logger.prototype, "logLevel", {
            get: function () {
                return this._logLevel;
            },
            set: function (val) {
                if (!(val in LogLevel)) {
                    throw new TypeError('Invalid value assigned to `logLevel`');
                }
                this._logLevel = val;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Logger.prototype, "logHandler", {
            get: function () {
                return this._logHandler;
            },
            set: function (val) {
                if (typeof val !== 'function') {
                    throw new TypeError('Value assigned to `logHandler` must be a function');
                }
                this._logHandler = val;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * The functions below are all based on the `console` interface
         */
        Logger.prototype.debug = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            this._logHandler.apply(this, __spreadArrays$1([this, LogLevel.DEBUG], args));
        };
        Logger.prototype.log = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            this._logHandler.apply(this, __spreadArrays$1([this, LogLevel.VERBOSE], args));
        };
        Logger.prototype.info = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            this._logHandler.apply(this, __spreadArrays$1([this, LogLevel.INFO], args));
        };
        Logger.prototype.warn = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            this._logHandler.apply(this, __spreadArrays$1([this, LogLevel.WARN], args));
        };
        Logger.prototype.error = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            this._logHandler.apply(this, __spreadArrays$1([this, LogLevel.ERROR], args));
        };
        return Logger;
    }());

    /**
     * @license
     * Copyright 2017 Google Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function setLogLevel(level) {
        instances.forEach(function (inst) {
            inst.logLevel = level;
        });
    }

    var index_esm = /*#__PURE__*/Object.freeze({
        __proto__: null,
        get LogLevel () { return LogLevel; },
        Logger: Logger,
        setLogLevel: setLogLevel
    });

    var index_cjs$2 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, '__esModule', { value: true });






    /**
     * @license
     * Copyright 2019 Google Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var _a;
    var ERRORS = (_a = {},
        _a["no-app" /* NO_APP */] = "No Firebase App '{$appName}' has been created - " +
            'call Firebase App.initializeApp()',
        _a["bad-app-name" /* BAD_APP_NAME */] = "Illegal App name: '{$appName}",
        _a["duplicate-app" /* DUPLICATE_APP */] = "Firebase App named '{$appName}' already exists",
        _a["app-deleted" /* APP_DELETED */] = "Firebase App named '{$appName}' already deleted",
        _a["invalid-app-argument" /* INVALID_APP_ARGUMENT */] = 'firebase.{$appName}() takes either no argument or a ' +
            'Firebase App instance.',
        _a);
    var ERROR_FACTORY = new index_cjs.ErrorFactory('app', 'Firebase', ERRORS);

    var name = "@firebase/app";
    var version = "0.5.0";

    var name$1 = "@firebase/analytics";

    var name$2 = "@firebase/auth";

    var name$3 = "@firebase/database";

    var name$4 = "@firebase/functions";

    var name$5 = "@firebase/installations";

    var name$6 = "@firebase/messaging";

    var name$7 = "@firebase/performance";

    var name$8 = "@firebase/remote-config";

    var name$9 = "@firebase/storage";

    var name$a = "@firebase/firestore";

    var name$b = "firebase-wrapper";

    /**
     * @license
     * Copyright 2019 Google Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var _a$1;
    var DEFAULT_ENTRY_NAME = '[DEFAULT]';
    var PLATFORM_LOG_STRING = (_a$1 = {},
        _a$1[name] = 'fire-core',
        _a$1[name$1] = 'fire-analytics',
        _a$1[name$2] = 'fire-auth',
        _a$1[name$3] = 'fire-rtdb',
        _a$1[name$4] = 'fire-fn',
        _a$1[name$5] = 'fire-iid',
        _a$1[name$6] = 'fire-fcm',
        _a$1[name$7] = 'fire-perf',
        _a$1[name$8] = 'fire-rc',
        _a$1[name$9] = 'fire-gcs',
        _a$1[name$a] = 'fire-fst',
        _a$1['fire-js'] = 'fire-js',
        _a$1[name$b] = 'fire-js-all',
        _a$1);

    /**
     * @license
     * Copyright 2019 Google Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var logger = new index_esm.Logger('@firebase/app');

    /**
     * @license
     * Copyright 2017 Google Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Global context object for a collection of services using
     * a shared authentication state.
     */
    var FirebaseAppImpl = /** @class */ (function () {
        function FirebaseAppImpl(options, config, firebase_) {
            var e_1, _a;
            var _this = this;
            this.firebase_ = firebase_;
            this.isDeleted_ = false;
            this.name_ = config.name;
            this.automaticDataCollectionEnabled_ =
                config.automaticDataCollectionEnabled || false;
            this.options_ = index_cjs.deepCopy(options);
            this.container = new index_cjs$1.ComponentContainer(config.name);
            // add itself to container
            this._addComponent(new index_cjs$1.Component('app', function () { return _this; }, "PUBLIC" /* PUBLIC */));
            try {
                // populate ComponentContainer with existing components
                for (var _b = tslib_es6.__values(this.firebase_.INTERNAL.components.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var component$1 = _c.value;
                    this._addComponent(component$1);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        Object.defineProperty(FirebaseAppImpl.prototype, "automaticDataCollectionEnabled", {
            get: function () {
                this.checkDestroyed_();
                return this.automaticDataCollectionEnabled_;
            },
            set: function (val) {
                this.checkDestroyed_();
                this.automaticDataCollectionEnabled_ = val;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FirebaseAppImpl.prototype, "name", {
            get: function () {
                this.checkDestroyed_();
                return this.name_;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FirebaseAppImpl.prototype, "options", {
            get: function () {
                this.checkDestroyed_();
                return this.options_;
            },
            enumerable: true,
            configurable: true
        });
        FirebaseAppImpl.prototype.delete = function () {
            var _this = this;
            return new Promise(function (resolve) {
                _this.checkDestroyed_();
                resolve();
            })
                .then(function () {
                _this.firebase_.INTERNAL.removeApp(_this.name_);
                return Promise.all(_this.container.getProviders().map(function (provider) { return provider.delete(); }));
            })
                .then(function () {
                _this.isDeleted_ = true;
            });
        };
        /**
         * Return a service instance associated with this app (creating it
         * on demand), identified by the passed instanceIdentifier.
         *
         * NOTE: Currently storage and functions are the only ones that are leveraging this
         * functionality. They invoke it by calling:
         *
         * ```javascript
         * firebase.app().storage('STORAGE BUCKET ID')
         * ```
         *
         * The service name is passed to this already
         * @internal
         */
        FirebaseAppImpl.prototype._getService = function (name, instanceIdentifier) {
            if (instanceIdentifier === void 0) { instanceIdentifier = DEFAULT_ENTRY_NAME; }
            this.checkDestroyed_();
            // getImmediate will always succeed because _getService is only called for registered components.
            return this.container.getProvider(name).getImmediate({
                identifier: instanceIdentifier
            });
        };
        /**
         * Remove a service instance from the cache, so we will create a new instance for this service
         * when people try to get this service again.
         *
         * NOTE: currently only firestore is using this functionality to support firestore shutdown.
         *
         * @param name The service name
         * @param instanceIdentifier instance identifier in case multiple instances are allowed
         * @internal
         */
        FirebaseAppImpl.prototype._removeServiceInstance = function (name, instanceIdentifier) {
            if (instanceIdentifier === void 0) { instanceIdentifier = DEFAULT_ENTRY_NAME; }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.container.getProvider(name).clearInstance(instanceIdentifier);
        };
        /**
         * @param component the component being added to this app's container
         */
        FirebaseAppImpl.prototype._addComponent = function (component) {
            try {
                this.container.addComponent(component);
            }
            catch (e) {
                logger.debug("Component " + component.name + " failed to register with FirebaseApp " + this.name, e);
            }
        };
        FirebaseAppImpl.prototype._addOrOverwriteComponent = function (component) {
            this.container.addOrOverwriteComponent(component);
        };
        /**
         * This function will throw an Error if the App has already been deleted -
         * use before performing API actions on the App.
         */
        FirebaseAppImpl.prototype.checkDestroyed_ = function () {
            if (this.isDeleted_) {
                throw ERROR_FACTORY.create("app-deleted" /* APP_DELETED */, { appName: this.name_ });
            }
        };
        return FirebaseAppImpl;
    }());
    // Prevent dead-code elimination of these methods w/o invalid property
    // copying.
    (FirebaseAppImpl.prototype.name && FirebaseAppImpl.prototype.options) ||
        FirebaseAppImpl.prototype.delete ||
        console.log('dc');

    var version$1 = "7.6.0";

    /**
     * @license
     * Copyright 2019 Google Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Because auth can't share code with other components, we attach the utility functions
     * in an internal namespace to share code.
     * This function return a firebase namespace object without
     * any utility functions, so it can be shared between the regular firebaseNamespace and
     * the lite version.
     */
    function createFirebaseNamespaceCore(firebaseAppImpl) {
        var apps = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        var components = new Map();
        // A namespace is a plain JavaScript Object.
        var namespace = {
            // Hack to prevent Babel from modifying the object returned
            // as the firebase namespace.
            // @ts-ignore
            __esModule: true,
            initializeApp: initializeApp,
            // @ts-ignore
            app: app,
            registerVersion: registerVersion,
            // @ts-ignore
            apps: null,
            SDK_VERSION: version$1,
            INTERNAL: {
                registerComponent: registerComponent,
                removeApp: removeApp,
                components: components,
                useAsService: useAsService
            }
        };
        // Inject a circular default export to allow Babel users who were previously
        // using:
        //
        //   import firebase from 'firebase';
        //   which becomes: var firebase = require('firebase').default;
        //
        // instead of
        //
        //   import * as firebase from 'firebase';
        //   which becomes: var firebase = require('firebase');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        namespace['default'] = namespace;
        // firebase.apps is a read-only getter.
        Object.defineProperty(namespace, 'apps', {
            get: getApps
        });
        /**
         * Called by App.delete() - but before any services associated with the App
         * are deleted.
         */
        function removeApp(name) {
            delete apps[name];
        }
        /**
         * Get the App object for a given name (or DEFAULT).
         */
        function app(name) {
            name = name || DEFAULT_ENTRY_NAME;
            if (!index_cjs.contains(apps, name)) {
                throw ERROR_FACTORY.create("no-app" /* NO_APP */, { appName: name });
            }
            return apps[name];
        }
        // @ts-ignore
        app['App'] = firebaseAppImpl;
        function initializeApp(options, rawConfig) {
            if (rawConfig === void 0) { rawConfig = {}; }
            if (typeof rawConfig !== 'object' || rawConfig === null) {
                var name_1 = rawConfig;
                rawConfig = { name: name_1 };
            }
            var config = rawConfig;
            if (config.name === undefined) {
                config.name = DEFAULT_ENTRY_NAME;
            }
            var name = config.name;
            if (typeof name !== 'string' || !name) {
                throw ERROR_FACTORY.create("bad-app-name" /* BAD_APP_NAME */, {
                    appName: String(name)
                });
            }
            if (index_cjs.contains(apps, name)) {
                throw ERROR_FACTORY.create("duplicate-app" /* DUPLICATE_APP */, { appName: name });
            }
            var app = new firebaseAppImpl(options, config, namespace);
            apps[name] = app;
            return app;
        }
        /*
         * Return an array of all the non-deleted FirebaseApps.
         */
        function getApps() {
            // Make a copy so caller cannot mutate the apps list.
            return Object.keys(apps).map(function (name) { return apps[name]; });
        }
        function registerComponent(component) {
            var e_1, _a;
            var componentName = component.name;
            if (components.has(componentName)) {
                logger.debug("There were multiple attempts to register component " + componentName + ".");
                return component.type === "PUBLIC" /* PUBLIC */
                    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        namespace[componentName]
                    : null;
            }
            components.set(componentName, component);
            // create service namespace for public components
            if (component.type === "PUBLIC" /* PUBLIC */) {
                // The Service namespace is an accessor function ...
                var serviceNamespace = function (appArg) {
                    if (appArg === void 0) { appArg = app(); }
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    if (typeof appArg[componentName] !== 'function') {
                        // Invalid argument.
                        // This happens in the following case: firebase.storage('gs:/')
                        throw ERROR_FACTORY.create("invalid-app-argument" /* INVALID_APP_ARGUMENT */, {
                            appName: componentName
                        });
                    }
                    // Forward service instance lookup to the FirebaseApp.
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    return appArg[componentName]();
                };
                // ... and a container for service-level properties.
                if (component.serviceProps !== undefined) {
                    index_cjs.deepExtend(serviceNamespace, component.serviceProps);
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                namespace[componentName] = serviceNamespace;
                // Patch the FirebaseAppImpl prototype
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                firebaseAppImpl.prototype[componentName] =
                    // TODO: The eslint disable can be removed and the 'ignoreRestArgs'
                    // option added to the no-explicit-any rule when ESlint releases it.
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    function () {
                        var args = [];
                        for (var _i = 0; _i < arguments.length; _i++) {
                            args[_i] = arguments[_i];
                        }
                        var serviceFxn = this._getService.bind(this, componentName);
                        return serviceFxn.apply(this, component.multipleInstances ? args : []);
                    };
            }
            try {
                // add the component to existing app instances
                for (var _b = tslib_es6.__values(Object.keys(apps)), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var appName = _c.value;
                    apps[appName]._addComponent(component);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return component.type === "PUBLIC" /* PUBLIC */
                ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    namespace[componentName]
                : null;
        }
        function registerVersion(libraryKeyOrName, version, variant) {
            var _a;
            // TODO: We can use this check to whitelist strings when/if we set up
            // a good whitelist system.
            var library = (_a = PLATFORM_LOG_STRING[libraryKeyOrName], (_a !== null && _a !== void 0 ? _a : libraryKeyOrName));
            if (variant) {
                library += "-" + variant;
            }
            var libraryMismatch = library.match(/\s|\//);
            var versionMismatch = version.match(/\s|\//);
            if (libraryMismatch || versionMismatch) {
                var warning = [
                    "Unable to register library \"" + library + "\" with version \"" + version + "\":"
                ];
                if (libraryMismatch) {
                    warning.push("library name \"" + library + "\" contains illegal characters (whitespace or \"/\")");
                }
                if (libraryMismatch && versionMismatch) {
                    warning.push('and');
                }
                if (versionMismatch) {
                    warning.push("version name \"" + version + "\" contains illegal characters (whitespace or \"/\")");
                }
                logger.warn(warning.join(' '));
                return;
            }
            registerComponent(new index_cjs$1.Component(library + "-version", function () { return ({ library: library, version: version }); }, "VERSION" /* VERSION */));
        }
        // Map the requested service to a registered service name
        // (used to map auth to serverAuth service when needed).
        function useAsService(app, name) {
            if (name === 'serverAuth') {
                return null;
            }
            var useService = name;
            return useService;
        }
        return namespace;
    }

    /**
     * @license
     * Copyright 2019 Google Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Return a firebase namespace object.
     *
     * In production, this will be called exactly once and the result
     * assigned to the 'firebase' global.  It may be called multiple times
     * in unit tests.
     */
    function createFirebaseNamespace() {
        var namespace = createFirebaseNamespaceCore(FirebaseAppImpl);
        namespace.INTERNAL = tslib_es6.__assign(tslib_es6.__assign({}, namespace.INTERNAL), { createFirebaseNamespace: createFirebaseNamespace,
            extendNamespace: extendNamespace,
            createSubscribe: index_cjs.createSubscribe,
            ErrorFactory: index_cjs.ErrorFactory,
            deepExtend: index_cjs.deepExtend });
        /**
         * Patch the top-level firebase namespace with additional properties.
         *
         * firebase.INTERNAL.extendNamespace()
         */
        function extendNamespace(props) {
            index_cjs.deepExtend(namespace, props);
        }
        return namespace;
    }
    var firebase = createFirebaseNamespace();

    /**
     * @license
     * Copyright 2019 Google Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    var PlatformLoggerService = /** @class */ (function () {
        function PlatformLoggerService(container) {
            this.container = container;
        }
        // In initial implementation, this will be called by installations on
        // auth token refresh, and installations will send this string.
        PlatformLoggerService.prototype.getPlatformInfoString = function () {
            var providers = this.container.getProviders();
            // Loop through providers and get library/version pairs from any that are
            // version components.
            return providers
                .map(function (provider) {
                if (isVersionServiceProvider(provider)) {
                    var service = provider.getImmediate();
                    return service.library + "/" + service.version;
                }
                else {
                    return null;
                }
            })
                .filter(function (logString) { return logString; })
                .join(' ');
        };
        return PlatformLoggerService;
    }());
    /**
     *
     * @param provider check if this provider provides a VersionService
     *
     * NOTE: Using Provider<'app-version'> is a hack to indicate that the provider
     * provides VersionService. The provider is not necessarily a 'app-version'
     * provider.
     */
    function isVersionServiceProvider(provider) {
        var _a;
        var component = provider.getComponent();
        return ((_a = component) === null || _a === void 0 ? void 0 : _a.type) === "VERSION" /* VERSION */;
    }

    /**
     * @license
     * Copyright 2019 Google Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    function registerCoreComponents(firebase, variant) {
        firebase.INTERNAL.registerComponent(new index_cjs$1.Component('platform-logger', function (container) { return new PlatformLoggerService(container); }, "PRIVATE" /* PRIVATE */));
        // Register `app` package.
        firebase.registerVersion(name, version, variant);
        // Register platform SDK identifier (no version).
        firebase.registerVersion('fire-js', '');
    }

    /**
     * @license
     * Copyright 2017 Google Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    // Firebase Lite detection
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (index_cjs.isBrowser() && self.firebase !== undefined) {
        logger.warn("\n    Warning: Firebase is already defined in the global scope. Please make sure\n    Firebase library is only loaded once.\n  ");
        // eslint-disable-next-line
        var sdkVersion = self.firebase.SDK_VERSION;
        if (sdkVersion && sdkVersion.indexOf('LITE') >= 0) {
            logger.warn("\n    Warning: You are trying to load Firebase while using Firebase Performance standalone script.\n    You should load Firebase Performance with this instance of Firebase to avoid loading duplicate code.\n    ");
        }
    }
    var initializeApp = firebase.initializeApp;
    // TODO: This disable can be removed and the 'ignoreRestArgs' option added to
    // the no-explicit-any rule when ESlint releases it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    firebase.initializeApp = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        // Environment check before initializing app
        // Do the check in initializeApp, so people have a chance to disable it by setting logLevel
        // in @firebase/logger
        if (index_cjs.isNode()) {
            logger.warn("\n      Warning: This is a browser-targeted Firebase bundle but it appears it is being\n      run in a Node environment.  If running in a Node environment, make sure you\n      are using the bundle specified by the \"main\" field in package.json.\n      \n      If you are using Webpack, you can specify \"main\" as the first item in\n      \"resolve.mainFields\":\n      https://webpack.js.org/configuration/resolve/#resolvemainfields\n      \n      If using Rollup, use the rollup-plugin-node-resolve plugin and specify \"main\"\n      as the first item in \"mainFields\", e.g. ['main', 'module'].\n      https://github.com/rollup/rollup-plugin-node-resolve\n      ");
        }
        return initializeApp.apply(undefined, args);
    };
    var firebase$1 = firebase;
    registerCoreComponents(firebase$1);

    exports.default = firebase$1;
    exports.firebase = firebase$1;

    });

    unwrapExports(index_cjs$2);
    var index_cjs_1$2 = index_cjs$2.firebase;

    function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

    var firebase = _interopDefault(index_cjs$2);

    var name = "firebase";
    var version = "7.6.0";

    /**
     * @license
     * Copyright 2018 Google Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    firebase.registerVersion(name, version, 'app');

    var index_cjs$3 = firebase;

    var firebaseFirestore = createCommonjsModule(function (module, exports) {
    !function(t,e){e(index_cjs$2);}(commonjsGlobal,function(zd){try{(function(){zd=zd&&zd.hasOwnProperty("default")?zd.default:zd;var r=function(t,e){return (r=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e;}||function(t,e){for(var n in e)e.hasOwnProperty(n)&&(t[n]=e[n]);})(t,e)};function t(t,e){function n(){this.constructor=t;}r(t,e),t.prototype=null===e?Object.create(e):(n.prototype=e.prototype,new n);}var o,e,l=function(){return (l=Object.assign||function(t){for(var e,n=1,r=arguments.length;n<r;n++)for(var i in e=arguments[n])Object.prototype.hasOwnProperty.call(e,i)&&(t[i]=e[i]);return t}).apply(this,arguments)};function p(o,a,s,u){return new(s=s||Promise)(function(t,e){function n(t){try{i(u.next(t));}catch(t){e(t);}}function r(t){try{i(u.throw(t));}catch(t){e(t);}}function i(e){e.done?t(e.value):new s(function(t){t(e.value);}).then(n,r);}i((u=u.apply(o,a||[])).next());})}function m(n,r){var i,o,a,t,s={label:0,sent:function(){if(1&a[0])throw a[1];return a[1]},trys:[],ops:[]};return t={next:e(0),throw:e(1),return:e(2)},"function"==typeof Symbol&&(t[Symbol.iterator]=function(){return this}),t;function e(e){return function(t){return function(e){if(i)throw new TypeError("Generator is already executing.");for(;s;)try{if(i=1,o&&(a=2&e[0]?o.return:e[0]?o.throw||((a=o.return)&&a.call(o),0):o.next)&&!(a=a.call(o,e[1])).done)return a;switch(o=0,a&&(e=[2&e[0],a.value]),e[0]){case 0:case 1:a=e;break;case 4:return s.label++,{value:e[1],done:!1};case 5:s.label++,o=e[1],e=[0];continue;case 7:e=s.ops.pop(),s.trys.pop();continue;default:if(!(a=0<(a=s.trys).length&&a[a.length-1])&&(6===e[0]||2===e[0])){s=0;continue}if(3===e[0]&&(!a||e[1]>a[0]&&e[1]<a[3])){s.label=e[1];break}if(6===e[0]&&s.label<a[1]){s.label=a[1],a=e;break}if(a&&s.label<a[2]){s.label=a[2],s.ops.push(e);break}a[2]&&s.ops.pop(),s.trys.pop();continue}e=r.call(n,s);}catch(t){e=[6,t],o=0;}finally{i=a=0;}if(5&e[0])throw e[1];return {value:e[0]?e[1]:void 0,done:!0}}([e,t])}}}function a(){for(var t=0,e=0,n=arguments.length;e<n;e++)t+=arguments[e].length;var r=Array(t),i=0;for(e=0;e<n;e++)for(var o=arguments[e],a=0,s=o.length;a<s;a++,i++)r[i]=o[a];return r}function s(){for(var t=0,e=0,n=arguments.length;e<n;e++)t+=arguments[e].length;var r=Array(t),i=0;for(e=0;e<n;e++)for(var o=arguments[e],a=0,s=o.length;a<s;a++,i++)r[i]=o[a];return r}(e=o=o||{})[e.DEBUG=0]="DEBUG",e[e.VERBOSE=1]="VERBOSE",e[e.INFO=2]="INFO",e[e.WARN=3]="WARN",e[e.ERROR=4]="ERROR",e[e.SILENT=5]="SILENT";function n(t,e){for(var n=[],r=2;r<arguments.length;r++)n[r-2]=arguments[r];if(!(e<t.logLevel)){var i=(new Date).toISOString();switch(e){case o.DEBUG:case o.VERBOSE:console.log.apply(console,s(["["+i+"]  "+t.name+":"],n));break;case o.INFO:console.info.apply(console,s(["["+i+"]  "+t.name+":"],n));break;case o.WARN:console.warn.apply(console,s(["["+i+"]  "+t.name+":"],n));break;case o.ERROR:console.error.apply(console,s(["["+i+"]  "+t.name+":"],n));break;default:throw new Error("Attempted to log a message with an invalid logType (value: "+e+")")}}}var i=o.INFO,u=(Object.defineProperty(c.prototype,"logLevel",{get:function(){return this._logLevel},set:function(t){if(!(t in o))throw new TypeError("Invalid value assigned to `logLevel`");this._logLevel=t;},enumerable:!0,configurable:!0}),Object.defineProperty(c.prototype,"logHandler",{get:function(){return this._logHandler},set:function(t){if("function"!=typeof t)throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=t;},enumerable:!0,configurable:!0}),c.prototype.debug=function(){for(var t=[],e=0;e<arguments.length;e++)t[e]=arguments[e];this._logHandler.apply(this,s([this,o.DEBUG],t));},c.prototype.log=function(){for(var t=[],e=0;e<arguments.length;e++)t[e]=arguments[e];this._logHandler.apply(this,s([this,o.VERBOSE],t));},c.prototype.info=function(){for(var t=[],e=0;e<arguments.length;e++)t[e]=arguments[e];this._logHandler.apply(this,s([this,o.INFO],t));},c.prototype.warn=function(){for(var t=[],e=0;e<arguments.length;e++)t[e]=arguments[e];this._logHandler.apply(this,s([this,o.WARN],t));},c.prototype.error=function(){for(var t=[],e=0;e<arguments.length;e++)t[e]=arguments[e];this._logHandler.apply(this,s([this,o.ERROR],t));},c);function c(t){this.name=t,this._logLevel=i,this._logHandler=n;}function h(){return "undefined"!=typeof navigator&&"string"==typeof navigator.userAgent?navigator.userAgent:""}var f,d=(t(y,f=Error),y);function y(t,e){var n=f.call(this,e)||this;return n.code=t,n.name="FirebaseError",Object.setPrototypeOf(n,y.prototype),Error.captureStackTrace&&Error.captureStackTrace(n,g.prototype.create),n}var g=(v.prototype.create=function(t){for(var e=[],n=1;n<arguments.length;n++)e[n-1]=arguments[n];for(var r=e[0]||{},i=this.service+"/"+t,o=this.errors[t],a=o?function(t,r){return t.replace(b,function(t,e){var n=r[e];return null!=n?n.toString():"<"+e+"?>"})}(o,r):"Error",s=this.serviceName+": "+a+" ("+i+").",u=new d(i,s),c=0,h=Object.keys(r);c<h.length;c++){var l=h[c];"_"!==l.slice(-1)&&(l in u&&console.warn('Overwriting FirebaseError base field "'+l+'" can cause unexpected behavior.'),u[l]=r[l]);}return u},v);function v(t,e,n){this.service=t,this.serviceName=e,this.errors=n;}var b=/\{\$([^}]+)}/g,w=(T.prototype.setInstantiationMode=function(t){return this.instantiationMode=t,this},T.prototype.setMultipleInstances=function(t){return this.multipleInstances=t,this},T.prototype.setServiceProps=function(t){return this.serviceProps=t,this},T);function T(t,e,n){this.name=t,this.instanceFactory=e,this.type=n,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY";}var S,E="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof window?window:"undefined"!=typeof commonjsGlobal?commonjsGlobal:"undefined"!=typeof self?self:{},I=I||{},C=E;function D(t){return "string"==typeof t}function N(t){return "number"==typeof t}function A(t,e){t=t.split("."),e=e||C;for(var n=0;n<t.length;n++)if(null==(e=e[t[n]]))return null;return e}function k(){}function R(t){var e=typeof t;if("object"==e){if(!t)return "null";if(t instanceof Array)return "array";if(t instanceof Object)return e;var n=Object.prototype.toString.call(t);if("[object Window]"==n)return "object";if("[object Array]"==n||"number"==typeof t.length&&void 0!==t.splice&&void 0!==t.propertyIsEnumerable&&!t.propertyIsEnumerable("splice"))return "array";if("[object Function]"==n||void 0!==t.call&&void 0!==t.propertyIsEnumerable&&!t.propertyIsEnumerable("call"))return "function"}else if("function"==e&&void 0===t.call)return "object";return e}function M(t){return "array"==R(t)}function _(t){var e=R(t);return "array"==e||"object"==e&&"number"==typeof t.length}function L(t){var e=typeof t;return "object"==e&&null!=t||"function"==e}var O="closure_uid_"+(1e9*Math.random()>>>0),P=0;function x(t,e,n){return t.call.apply(t.bind,arguments)}function F(e,n,t){if(!e)throw Error();if(2<arguments.length){var r=Array.prototype.slice.call(arguments,2);return function(){var t=Array.prototype.slice.call(arguments);return Array.prototype.unshift.apply(t,r),e.apply(n,t)}}return function(){return e.apply(n,arguments)}}function q(t,e,n){return (q=Function.prototype.bind&&-1!=Function.prototype.bind.toString().indexOf("native code")?x:F).apply(null,arguments)}function V(e,t){var n=Array.prototype.slice.call(arguments,1);return function(){var t=n.slice();return t.push.apply(t,arguments),e.apply(this,t)}}var B=Date.now||function(){return +new Date};function U(t,o){function e(){}e.prototype=o.prototype,t.N=o.prototype,t.prototype=new e,(t.prototype.constructor=t).xb=function(t,e,n){for(var r=Array(arguments.length-2),i=2;i<arguments.length;i++)r[i-2]=arguments[i];return o.prototype[e].apply(t,r)};}function K(){this.j=this.j,this.i=this.i;}K.prototype.j=!1,K.prototype.la=function(){if(!this.j&&(this.j=!0,this.G(),0))this[O]||(this[O]=++P);},K.prototype.G=function(){if(this.i)for(;this.i.length;)this.i.shift()();};var Q=Array.prototype.indexOf?function(t,e){return Array.prototype.indexOf.call(t,e,void 0)}:function(t,e){if(D(t))return D(e)&&1==e.length?t.indexOf(e,0):-1;for(var n=0;n<t.length;n++)if(n in t&&t[n]===e)return n;return -1},W=Array.prototype.forEach?function(t,e,n){Array.prototype.forEach.call(t,e,n);}:function(t,e,n){for(var r=t.length,i=D(t)?t.split(""):t,o=0;o<r;o++)o in i&&e.call(n,i[o],o,t);};function j(t){return Array.prototype.concat.apply([],arguments)}function G(t){var e=t.length;if(0<e){for(var n=Array(e),r=0;r<e;r++)n[r]=t[r];return n}return []}function z(t){return /^[\s\xa0]*$/.test(t)}var H,Y=String.prototype.trim?function(t){return t.trim()}:function(t){return /^[\s\xa0]*([\s\S]*?)[\s\xa0]*$/.exec(t)[1]};function J(t,e){return -1!=t.indexOf(e)}function X(t,e){return t<e?-1:e<t?1:0}t:{var Z=C.navigator;if(Z){var $=Z.userAgent;if($){H=$;break t}}H="";}function tt(t,e,n){for(var r in t)e.call(n,t[r],r,t);}function et(t){var e,n={};for(e in t)n[e]=t[e];return n}var nt="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function rt(t,e){for(var n,r,i=1;i<arguments.length;i++){for(n in r=arguments[i])t[n]=r[n];for(var o=0;o<nt.length;o++)n=nt[o],Object.prototype.hasOwnProperty.call(r,n)&&(t[n]=r[n]);}}function it(t){return it[" "](t),t}it[" "]=k;var ot,at,st=J(H,"Opera"),ut=J(H,"Trident")||J(H,"MSIE"),ct=J(H,"Edge"),ht=ct||ut,lt=J(H,"Gecko")&&!(J(H.toLowerCase(),"webkit")&&!J(H,"Edge"))&&!(J(H,"Trident")||J(H,"MSIE"))&&!J(H,"Edge"),ft=J(H.toLowerCase(),"webkit")&&!J(H,"Edge");function pt(){var t=C.document;return t?t.documentMode:void 0}t:{var dt="",mt=(at=H,lt?/rv:([^\);]+)(\)|;)/.exec(at):ct?/Edge\/([\d\.]+)/.exec(at):ut?/\b(?:MSIE|rv)[: ]([^\);]+)(\)|;)/.exec(at):ft?/WebKit\/(\S+)/.exec(at):st?/(?:Version)[ \/]?(\S+)/.exec(at):void 0);if(mt&&(dt=mt?mt[1]:""),ut){var yt=pt();if(null!=yt&&yt>parseFloat(dt)){ot=String(yt);break t}}ot=dt;}var gt,vt={};function bt(s){return function(t,e){var n=vt;return Object.prototype.hasOwnProperty.call(n,t)?n[t]:n[t]=e(t)}(s,function(){for(var t=0,e=Y(String(ot)).split("."),n=Y(String(s)).split("."),r=Math.max(e.length,n.length),i=0;0==t&&i<r;i++){var o=e[i]||"",a=n[i]||"";do{if(o=/(\d*)(\D*)(.*)/.exec(o)||["","","",""],a=/(\d*)(\D*)(.*)/.exec(a)||["","","",""],0==o[0].length&&0==a[0].length)break;t=X(0==o[1].length?0:parseInt(o[1],10),0==a[1].length?0:parseInt(a[1],10))||X(0==o[2].length,0==a[2].length)||X(o[2],a[2]),o=o[3],a=a[3];}while(0==t)}return 0<=t})}var wt=C.document;gt=wt&&ut?pt()||("CSS1Compat"==wt.compatMode?parseInt(ot,10):5):void 0;var Tt=!ut||9<=Number(gt),St=ut&&!bt("9"),Et=function(){if(!C.addEventListener||!Object.defineProperty)return !1;var t=!1,e=Object.defineProperty({},"passive",{get:function(){t=!0;}});try{C.addEventListener("test",k,e),C.removeEventListener("test",k,e);}catch(t){}return t}();function It(t,e){this.type=t,this.a=this.target=e,this.Ia=!0;}function Ct(t,e){if(It.call(this,t?t.type:""),this.relatedTarget=this.a=this.target=null,this.button=this.screenY=this.screenX=this.clientY=this.clientX=0,this.key="",this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1,this.pointerId=0,this.pointerType="",this.c=null,t){var n=this.type=t.type,r=t.changedTouches&&t.changedTouches.length?t.changedTouches[0]:null;if(this.target=t.target||t.srcElement,this.a=e,e=t.relatedTarget){if(lt){t:{try{it(e.nodeName);var i=!0;break t}catch(t){}i=!1;}i||(e=null);}}else"mouseover"==n?e=t.fromElement:"mouseout"==n&&(e=t.toElement);this.relatedTarget=e,r?(this.clientX=void 0!==r.clientX?r.clientX:r.pageX,this.clientY=void 0!==r.clientY?r.clientY:r.pageY,this.screenX=r.screenX||0,this.screenY=r.screenY||0):(this.clientX=void 0!==t.clientX?t.clientX:t.pageX,this.clientY=void 0!==t.clientY?t.clientY:t.pageY,this.screenX=t.screenX||0,this.screenY=t.screenY||0),this.button=t.button,this.key=t.key||"",this.ctrlKey=t.ctrlKey,this.altKey=t.altKey,this.shiftKey=t.shiftKey,this.metaKey=t.metaKey,this.pointerId=t.pointerId||0,this.pointerType=D(t.pointerType)?t.pointerType:Dt[t.pointerType]||"",(this.c=t).defaultPrevented&&this.b();}}It.prototype.b=function(){this.Ia=!1;},U(Ct,It);var Dt={2:"touch",3:"pen",4:"mouse"};Ct.prototype.b=function(){Ct.N.b.call(this);var t=this.c;if(t.preventDefault)t.preventDefault();else if(t.returnValue=!1,St)try{(t.ctrlKey||112<=t.keyCode&&t.keyCode<=123)&&(t.keyCode=-1);}catch(t){}};var Nt="closure_listenable_"+(1e6*Math.random()|0),At=0;function kt(t,e,n,r,i){this.listener=t,this.proxy=null,this.src=e,this.type=n,this.capture=!!r,this.da=i,this.key=++At,this.X=this.Z=!1;}function Rt(t){t.X=!0,t.listener=null,t.proxy=null,t.src=null,t.da=null;}function Mt(t){this.src=t,this.a={},this.b=0;}function _t(t,e){var n=e.type;if(n in t.a){var r,i=t.a[n],o=Q(i,e);(r=0<=o)&&Array.prototype.splice.call(i,o,1),r&&(Rt(e),0==t.a[n].length&&(delete t.a[n],t.b--));}}function Lt(t,e,n,r){for(var i=0;i<t.length;++i){var o=t[i];if(!o.X&&o.listener==e&&o.capture==!!n&&o.da==r)return i}return -1}Mt.prototype.add=function(t,e,n,r,i){var o=t.toString();(t=this.a[o])||(t=this.a[o]=[],this.b++);var a=Lt(t,e,r,i);return -1<a?(e=t[a],n||(e.Z=!1)):((e=new kt(e,this.src,o,!!r,i)).Z=n,t.push(e)),e};var Ot="closure_lm_"+(1e6*Math.random()|0),Pt={};function xt(t,e,n,r,i){if(r&&r.once)return function t(e,n,r,i,o){if(M(n)){for(var a=0;a<n.length;a++)t(e,n[a],r,i,o);return null}r=Wt(r);return e&&e[Nt]?e.Aa(n,r,L(i)?!!i.capture:!!i,o):Ft(e,n,r,!0,i,o)}(t,e,n,r,i);if(M(e)){for(var o=0;o<e.length;o++)xt(t,e[o],n,r,i);return null}return n=Wt(n),t&&t[Nt]?t.za(e,n,L(r)?!!r.capture:!!r,i):Ft(t,e,n,!1,r,i)}function Ft(t,e,n,r,i,o){if(!e)throw Error("Invalid event type");var a=L(i)?!!i.capture:!!i;if(a&&!Tt)return null;var s=Kt(t);if(s||(t[Ot]=s=new Mt(t)),(n=s.add(e,n,r,a,o)).proxy)return n;if(r=function(){var e=Ut,n=Tt?function(t){return e.call(n.src,n.listener,t)}:function(t){if(!(t=e.call(n.src,n.listener,t)))return t};return n}(),(n.proxy=r).src=t,r.listener=n,t.addEventListener)Et||(i=a),void 0===i&&(i=!1),t.addEventListener(e.toString(),r,i);else if(t.attachEvent)t.attachEvent(Vt(e.toString()),r);else{if(!t.addListener||!t.removeListener)throw Error("addEventListener and attachEvent are unavailable.");t.addListener(r);}return n}function qt(t){if(!N(t)&&t&&!t.X){var e=t.src;if(e&&e[Nt])_t(e.c,t);else{var n=t.type,r=t.proxy;e.removeEventListener?e.removeEventListener(n,r,t.capture):e.detachEvent?e.detachEvent(Vt(n),r):e.addListener&&e.removeListener&&e.removeListener(r),(n=Kt(e))?(_t(n,t),0==n.b&&(n.src=null,e[Ot]=null)):Rt(t);}}}function Vt(t){return t in Pt?Pt[t]:Pt[t]="on"+t}function Bt(t,e){var n=t.listener,r=t.da||t.src;return t.Z&&qt(t),n.call(r,e)}function Ut(t,e){return !!t.X||(Tt?Bt(t,new Ct(e,this)):Bt(t,e=new Ct(e||A("window.event"),this)))}function Kt(t){return (t=t[Ot])instanceof Mt?t:null}var Qt="__closure_events_fn_"+(1e9*Math.random()>>>0);function Wt(e){return "function"==R(e)?e:(e[Qt]||(e[Qt]=function(t){return e.handleEvent(t)}),e[Qt])}function jt(){K.call(this),this.c=new Mt(this),(this.J=this).B=null;}function Gt(t,e,n,r){if(!(e=t.c.a[String(e)]))return !0;e=e.concat();for(var i=!0,o=0;o<e.length;++o){var a=e[o];if(a&&!a.X&&a.capture==n){var s=a.listener,u=a.da||a.src;a.Z&&_t(t.c,a),i=!1!==s.call(u,r)&&i;}}return i&&0!=r.Ia}U(jt,K),jt.prototype[Nt]=!0,(S=jt.prototype).addEventListener=function(t,e,n,r){xt(this,t,e,n,r);},S.removeEventListener=function(t,e,n,r){!function t(e,n,r,i,o){if(M(n))for(var a=0;a<n.length;a++)t(e,n[a],r,i,o);else i=L(i)?!!i.capture:!!i,r=Wt(r),e&&e[Nt]?(e=e.c,(n=String(n).toString())in e.a&&-1<(r=Lt(a=e.a[n],r,i,o))&&(Rt(a[r]),Array.prototype.splice.call(a,r,1),0==a.length&&(delete e.a[n],e.b--))):(e=e&&Kt(e))&&(n=e.a[n.toString()],e=-1,n&&(e=Lt(n,r,i,o)),(r=-1<e?n[e]:null)&&qt(r));}(this,t,e,n,r);},S.dispatchEvent=function(t){var e,n=this.B;if(n)for(e=[];n;n=n.B)e.push(n);n=this.J;var r=t.type||t;if(D(t))t=new It(t,n);else if(t instanceof It)t.target=t.target||n;else{var i=t;rt(t=new It(r,n),i);}if(i=!0,e)for(var o=e.length-1;0<=o;o--){var a=t.a=e[o];i=Gt(a,r,!0,t)&&i;}if(i=Gt(a=t.a=n,r,!0,t)&&i,i=Gt(a,r,!1,t)&&i,e)for(o=0;o<e.length;o++)i=Gt(a=t.a=e[o],r,!1,t)&&i;return i},S.G=function(){if(jt.N.G.call(this),this.c){var t,e=this.c;for(t in e.a){for(var n=e.a[t],r=0;r<n.length;r++)Rt(n[r]);delete e.a[t],e.b--;}}this.B=null;},S.za=function(t,e,n,r){return this.c.add(String(t),e,!1,n,r)},S.Aa=function(t,e,n,r){return this.c.add(String(t),e,!0,n,r)};var zt=C.JSON.stringify;function Ht(t,e){this.c=t,this.f=e,this.b=0,this.a=null;}function Yt(){this.b=this.a=null;}Ht.prototype.get=function(){if(0<this.b){this.b--;var t=this.a;this.a=t.next,t.next=null;}else t=this.c();return t};var Jt,Xt=new Ht(function(){return new Zt},function(t){t.reset();});function Zt(){this.next=this.b=this.a=null;}function $t(t){C.setTimeout(function(){throw t},0);}function te(t,e){Jt||function(){var t=C.Promise.resolve(void 0);Jt=function(){t.then(re);};}(),ee||(Jt(),ee=!0),ne.add(t,e);}Yt.prototype.add=function(t,e){var n=Xt.get();n.set(t,e),this.b?this.b.next=n:this.a=n,this.b=n;},Zt.prototype.set=function(t,e){this.a=t,this.b=e,this.next=null;};var ee=!(Zt.prototype.reset=function(){this.next=this.b=this.a=null;}),ne=new Yt;function re(){for(var t;r=n=void 0,r=null,(n=ne).a&&(r=n.a,n.a=n.a.next,n.a||(n.b=null),r.next=null),t=r;){try{t.a.call(t.b);}catch(t){$t(t);}var e=Xt;e.f(t),e.b<100&&(e.b++,t.next=e.a,e.a=t);}var n,r;ee=!1;}function ie(t,e){jt.call(this),this.b=t||1,this.a=e||C,this.f=q(this.fb,this),this.g=B();}function oe(t){t.ba=!1,t.L&&(t.a.clearTimeout(t.L),t.L=null);}function ae(t,e,n){if("function"==R(t))n&&(t=q(t,n));else{if(!t||"function"!=typeof t.handleEvent)throw Error("Invalid listener argument");t=q(t.handleEvent,t);}return 2147483647<Number(e)?-1:C.setTimeout(t,e||0)}function se(t,e,n){K.call(this),this.f=null!=n?q(t,n):t,this.c=e,this.b=q(this.$a,this),this.a=[];}function ue(t){t.U=ae(t.b,t.c),t.f.apply(null,t.a);}function ce(t){K.call(this),this.b=t,this.a={};}U(ie,jt),(S=ie.prototype).ba=!1,S.L=null,S.fb=function(){if(this.ba){var t=B()-this.g;0<t&&t<.8*this.b?this.L=this.a.setTimeout(this.f,this.b-t):(this.L&&(this.a.clearTimeout(this.L),this.L=null),this.dispatchEvent("tick"),this.ba&&(oe(this),this.start()));}},S.start=function(){this.ba=!0,this.L||(this.L=this.a.setTimeout(this.f,this.b),this.g=B());},S.G=function(){ie.N.G.call(this),oe(this),delete this.a;},U(se,K),(S=se.prototype).ea=!1,S.U=null,S.Ta=function(t){this.a=arguments,this.U?this.ea=!0:ue(this);},S.G=function(){se.N.G.call(this),this.U&&(C.clearTimeout(this.U),this.U=null,this.ea=!1,this.a=[]);},S.$a=function(){this.U=null,this.ea&&(this.ea=!1,ue(this));},U(ce,K);var he=[];function le(t,e,n,r){M(n)||(n&&(he[0]=n.toString()),n=he);for(var i=0;i<n.length;i++){var o=xt(e,n[i],r||t.handleEvent,!1,t.b||t);if(!o)break;t.a[o.key]=o;}}function fe(t){tt(t.a,function(t,e){this.a.hasOwnProperty(e)&&qt(t);},t),t.a={};}function pe(){}ce.prototype.G=function(){ce.N.G.call(this),fe(this);},ce.prototype.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented")};var de=new jt;function me(t){It.call(this,"serverreachability",t);}function ye(t){de.dispatchEvent(new me(de,t));}function ge(t){It.call(this,"statevent",t);}function ve(t){de.dispatchEvent(new ge(de,t));}function be(t){It.call(this,"timingevent",t);}function we(t,e){if("function"!=R(t))throw Error("Fn must not be null and must be a function");return C.setTimeout(function(){t();},e)}U(me,It),U(ge,It),U(be,It);var Te={NO_ERROR:0,gb:1,nb:2,mb:3,jb:4,lb:5,ob:6,La:7,TIMEOUT:8,rb:9},Se={ib:"complete",vb:"success",Ma:"error",La:"abort",tb:"ready",ub:"readystatechange",TIMEOUT:"timeout",pb:"incrementaldata",sb:"progress",kb:"downloadprogress",wb:"uploadprogress"};function Ee(){}function Ie(t){var e;return (e=t.a)||(e=t.a={}),e}function Ce(){}Ee.prototype.a=null;var De,Ne={OPEN:"a",hb:"b",Ma:"c",qb:"d"};function Ae(){It.call(this,"d");}function ke(){It.call(this,"c");}function Re(){}function Me(t,e,n){this.g=t,this.W=e,this.V=n||1,this.I=new ce(this),this.O=_e,t=ht?125:void 0,this.P=new ie(t),this.h=null,this.b=!1,this.l=this.D=this.f=this.F=this.v=this.R=this.i=null,this.j=[],this.a=null,this.A=0,this.c=this.w=null,this.o=-1,this.m=!1,this.J=0,this.B=null,this.s=this.S=this.H=!1;}U(Ae,It),U(ke,It),U(Re,Ee),De=new Re;var _e=45e3,Le={},Oe={};function Pe(t,e,n){t.F=1,t.f=sn($e(e)),t.l=n,t.H=!0,Fe(t,null);}function xe(t,e,n,r){t.F=1,t.f=sn($e(e)),t.l=null,t.H=n,Fe(t,r);}function Fe(t,e){t.v=B(),Be(t),t.D=$e(t.f),an(t.D,"t",t.V),t.A=0,t.a=t.g.$(t.g.Y()?e:null),0<t.J&&(t.B=new se(q(t.Ja,t,t.a),t.J)),le(t.I,t.a,"readystatechange",t.cb),e=t.h?et(t.h):{},t.l?(t.w||(t.w="POST"),e["Content-Type"]="application/x-www-form-urlencoded",t.a.ca(t.D,t.w,t.l,e)):(t.w="GET",t.a.ca(t.D,t.w,null,e)),ye(1);}function qe(t,e,n){for(var r=!0;!t.m&&t.A<n.length;){var i=Ve(t,n);if(i==Oe){4==e&&(t.c=4,ve(14),r=!1);break}if(i==Le){t.c=4,ve(15),r=!1;break}je(t,i);}4==e&&0==n.length&&(t.c=1,ve(16),r=!1),t.b=t.b&&r,r||(We(t),Qe(t));}function Ve(t,e){var n=t.A,r=e.indexOf("\n",n);return -1==r?Oe:(n=Number(e.substring(n,r)),isNaN(n)?Le:(r+=1)+n>e.length?Oe:(e=e.substr(r,n),t.A=r+n,e))}function Be(t){t.R=B()+t.O,Ue(t,t.O);}function Ue(t,e){if(null!=t.i)throw Error("WatchDog timer not null");t.i=we(q(t.ab,t),e);}function Ke(t){t.i&&(C.clearTimeout(t.i),t.i=null);}function Qe(t){t.g.Ca()||t.m||t.g.na(t);}function We(t){Ke(t);var e=t.B;e&&"function"==typeof e.la&&e.la(),t.B=null,oe(t.P),fe(t.I),t.a&&(e=t.a,t.a=null,e.abort(),e.la());}function je(t,e){try{t.g.Fa(t,e),ye(4);}catch(t){}}function Ge(t,e){if(t.forEach&&"function"==typeof t.forEach)t.forEach(e,void 0);else if(_(t)||D(t))W(t,e,void 0);else{if(t.K&&"function"==typeof t.K)var n=t.K();else if(t.C&&"function"==typeof t.C)n=void 0;else if(_(t)||D(t)){n=[];for(var r=t.length,i=0;i<r;i++)n.push(i);}else for(i in n=[],r=0,t)n[r++]=i;i=(r=function(t){if(t.C&&"function"==typeof t.C)return t.C();if(D(t))return t.split("");if(_(t)){for(var e=[],n=t.length,r=0;r<n;r++)e.push(t[r]);return e}for(r in e=[],n=0,t)e[n++]=t[r];return e}(t)).length;for(var o=0;o<i;o++)e.call(void 0,r[o],n&&n[o],t);}}function ze(t,e){this.b={},this.a=[],this.c=0;var n=arguments.length;if(1<n){if(n%2)throw Error("Uneven number of arguments");for(var r=0;r<n;r+=2)this.set(arguments[r],arguments[r+1]);}else if(t)if(t instanceof ze)for(n=t.K(),r=0;r<n.length;r++)this.set(n[r],t.get(n[r]));else for(r in t)this.set(r,t[r]);}function He(t,e){Je(t.b,e)&&(delete t.b[e],t.c--,t.a.length>2*t.c&&Ye(t));}function Ye(t){if(t.c!=t.a.length){for(var e=0,n=0;e<t.a.length;){var r=t.a[e];Je(t.b,r)&&(t.a[n++]=r),e++;}t.a.length=n;}if(t.c!=t.a.length){var i={};for(n=e=0;e<t.a.length;)Je(i,r=t.a[e])||(i[t.a[n++]=r]=1),e++;t.a.length=n;}}function Je(t,e){return Object.prototype.hasOwnProperty.call(t,e)}(S=Me.prototype).setTimeout=function(t){this.O=t;},S.cb=function(t){t=t.target;var e=this.B;e&&3==$n(t)?e.Ta():this.Ja(t);},S.Ja=function(t){try{if(t==this.a)t:{var e=$n(this.a),n=this.a.ya(),r=this.a.T();if(!(e<3||3==e&&!ht&&!this.a.aa())){this.m||4!=e||7==n||ye(8==n||r<=0?3:2),Ke(this);var i=this.a.T();this.o=i;var o=this.a.aa();if(this.b=200==i){if(this.S&&!this.s){e:{if(this.a){var a=tr(this.a,"X-HTTP-Initial-Response");if(a&&!z(a)){var s=a;break e}}s=null;}if(!s){this.b=!1,this.c=3,ve(12),We(this),Qe(this);break t}this.s=!0,je(this,s);}this.H?(qe(this,e,o),ht&&this.b&&3==e&&(le(this.I,this.P,"tick",this.bb),this.P.start())):je(this,o),4==e&&We(this),this.b&&!this.m&&(4==e?this.g.na(this):(this.b=!1,Be(this)));}else 400==i&&0<o.indexOf("Unknown SID")?(this.c=3,ve(12)):(this.c=0,ve(13)),We(this),Qe(this);}}}catch(t){}},S.bb=function(){if(this.a){var t=$n(this.a),e=this.a.aa();this.A<e.length&&(Ke(this),qe(this,t,e),this.b&&4!=t&&Be(this));}},S.cancel=function(){this.m=!0,We(this);},S.ab=function(){this.i=null;var t=B();0<=t-this.R?(2!=this.F&&(ye(3),ve(17)),We(this),this.c=2,Qe(this)):Ue(this,this.R-t);},(S=ze.prototype).C=function(){Ye(this);for(var t=[],e=0;e<this.a.length;e++)t.push(this.b[this.a[e]]);return t},S.K=function(){return Ye(this),this.a.concat()},S.get=function(t,e){return Je(this.b,t)?this.b[t]:e},S.set=function(t,e){Je(this.b,t)||(this.c++,this.a.push(t)),this.b[t]=e;},S.forEach=function(t,e){for(var n=this.K(),r=0;r<n.length;r++){var i=n[r],o=this.get(i);t.call(e,o,i,this);}};var Xe=/^(?:([^:/?#.]+):)?(?:\/\/(?:([^/?#]*)@)?([^/#?]*?)(?::([0-9]+))?(?=[/#?]|$))?([^?#]+)?(?:\?([^#]*))?(?:#([\s\S]*))?$/;function Ze(t,e){var n;this.b=this.j=this.f="",this.i=null,this.g=this.a="",this.h=!1,t instanceof Ze?(this.h=void 0!==e?e:t.h,tn(this,t.f),this.j=t.j,en(this,t.b),nn(this,t.i),this.a=t.a,rn(this,Tn(t.c)),this.g=t.g):t&&(n=String(t).match(Xe))?(this.h=!!e,tn(this,n[1]||"",!0),this.j=un(n[2]||""),en(this,n[3]||"",!0),nn(this,n[4]),this.a=un(n[5]||"",!0),rn(this,n[6]||"",!0),this.g=un(n[7]||"")):(this.h=!!e,this.c=new yn(null,this.h));}function $e(t){return new Ze(t)}function tn(t,e,n){t.f=n?un(e,!0):e,t.f&&(t.f=t.f.replace(/:$/,""));}function en(t,e,n){t.b=n?un(e,!0):e;}function nn(t,e){if(e){if(e=Number(e),isNaN(e)||e<0)throw Error("Bad port number "+e);t.i=e;}else t.i=null;}function rn(t,e,n){e instanceof yn?(t.c=e,function(t,e){e&&!t.f&&(gn(t),t.c=null,t.a.forEach(function(t,e){var n=e.toLowerCase();e!=n&&(vn(this,e),wn(this,n,t));},t)),t.f=e;}(t.c,t.h)):(n||(e=cn(e,dn)),t.c=new yn(e,t.h));}function on(t,e,n){t.c.set(e,n);}function an(t,e,n){M(n)||(n=[String(n)]),wn(t.c,e,n);}function sn(t){return on(t,"zx",Math.floor(2147483648*Math.random()).toString(36)+Math.abs(Math.floor(2147483648*Math.random())^B()).toString(36)),t}function un(t,e){return t?e?decodeURI(t.replace(/%25/g,"%2525")):decodeURIComponent(t):""}function cn(t,e,n){return D(t)?(t=encodeURI(t).replace(e,hn),n&&(t=t.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),t):null}function hn(t){return "%"+((t=t.charCodeAt(0))>>4&15).toString(16)+(15&t).toString(16)}Ze.prototype.toString=function(){var t=[],e=this.f;e&&t.push(cn(e,ln,!0),":");var n=this.b;return !n&&"file"!=e||(t.push("//"),(e=this.j)&&t.push(cn(e,ln,!0),"@"),t.push(encodeURIComponent(String(n)).replace(/%25([0-9a-fA-F]{2})/g,"%$1")),null!=(n=this.i)&&t.push(":",String(n))),(n=this.a)&&(this.b&&"/"!=n.charAt(0)&&t.push("/"),t.push(cn(n,"/"==n.charAt(0)?pn:fn,!0))),(n=this.c.toString())&&t.push("?",n),(n=this.g)&&t.push("#",cn(n,mn)),t.join("")},Ze.prototype.resolve=function(t){var e=$e(this),n=!!t.f;n?tn(e,t.f):n=!!t.j,n?e.j=t.j:n=!!t.b,n?en(e,t.b):n=null!=t.i;var r=t.a;if(n)nn(e,t.i);else if(n=!!t.a){if("/"!=r.charAt(0))if(this.b&&!this.a)r="/"+r;else{var i=e.a.lastIndexOf("/");-1!=i&&(r=e.a.substr(0,i+1)+r);}if(".."==(i=r)||"."==i)r="";else if(J(i,"./")||J(i,"/.")){r=0==i.lastIndexOf("/",0),i=i.split("/");for(var o=[],a=0;a<i.length;){var s=i[a++];"."==s?r&&a==i.length&&o.push(""):".."==s?((1<o.length||1==o.length&&""!=o[0])&&o.pop(),r&&a==i.length&&o.push("")):(o.push(s),r=!0);}r=o.join("/");}else r=i;}return n?e.a=r:n=""!==t.c.toString(),n?rn(e,Tn(t.c)):n=!!t.g,n&&(e.g=t.g),e};var ln=/[#\/\?@]/g,fn=/[#\?:]/g,pn=/[#\?]/g,dn=/[#\?@]/g,mn=/#/g;function yn(t,e){this.b=this.a=null,this.c=t||null,this.f=!!e;}function gn(n){n.a||(n.a=new ze,n.b=0,n.c&&function(t,e){if(t){t=t.split("&");for(var n=0;n<t.length;n++){var r=t[n].indexOf("="),i=null;if(0<=r){var o=t[n].substring(0,r);i=t[n].substring(r+1);}else o=t[n];e(o,i?decodeURIComponent(i.replace(/\+/g," ")):"");}}}(n.c,function(t,e){n.add(decodeURIComponent(t.replace(/\+/g," ")),e);}));}function vn(t,e){gn(t),e=Sn(t,e),Je(t.a.b,e)&&(t.c=null,t.b-=t.a.get(e).length,He(t.a,e));}function bn(t,e){return gn(t),e=Sn(t,e),Je(t.a.b,e)}function wn(t,e,n){vn(t,e),0<n.length&&(t.c=null,t.a.set(Sn(t,e),G(n)),t.b+=n.length);}function Tn(t){var e=new yn;return e.c=t.c,t.a&&(e.a=new ze(t.a),e.b=t.b),e}function Sn(t,e){return e=String(e),t.f&&(e=e.toLowerCase()),e}function En(t){this.a=t,this.b=this.h=null,this.g=!1,this.i=null,this.c=-1,this.l=this.f=null;}function In(t){var e=t.a.F.a;if(null!=e)ve(4),e?(ve(10),fr(t.a,t,!1)):(ve(11),fr(t.a,t,!0));else{t.b=new Me(t,void 0,void 0),t.b.h=t.h,e=gr(e=t.a,e.Y()?t.f:null,t.i),ve(4),an(e,"TYPE","xmlhttp");var n=t.a.j,r=t.a.I;n&&r&&on(e,n,r),xe(t.b,e,!1,t.f);}}function Cn(){this.a=this.b=null;}function Dn(){this.a=new ze;}function Nn(t){var e=typeof t;return "object"==e&&t||"function"==e?"o"+(t[O]||(t[O]=++P)):e.charAt(0)+t}function An(t,e){this.b=t,this.a=e;}function kn(t){this.g=t||Rn,t=C.PerformanceNavigationTiming?0<(t=C.performance.getEntriesByType("navigation")).length&&("hq"==t[0].nextHopProtocol||"h2"==t[0].nextHopProtocol):!!(C.ka&&C.ka.Da&&C.ka.Da()&&C.ka.Da().yb),this.f=t?this.g:1,this.a=null,1<this.f&&(this.a=new Dn),this.b=null,this.c=[];}(S=yn.prototype).add=function(t,e){gn(this),this.c=null,t=Sn(this,t);var n=this.a.get(t);return n||this.a.set(t,n=[]),n.push(e),this.b+=1,this},S.forEach=function(n,r){gn(this),this.a.forEach(function(t,e){W(t,function(t){n.call(r,t,e,this);},this);},this);},S.K=function(){gn(this);for(var t=this.a.C(),e=this.a.K(),n=[],r=0;r<e.length;r++)for(var i=t[r],o=0;o<i.length;o++)n.push(e[r]);return n},S.C=function(t){gn(this);var e=[];if(D(t))bn(this,t)&&(e=j(e,this.a.get(Sn(this,t))));else{t=this.a.C();for(var n=0;n<t.length;n++)e=j(e,t[n]);}return e},S.set=function(t,e){return gn(this),this.c=null,bn(this,t=Sn(this,t))&&(this.b-=this.a.get(t).length),this.a.set(t,[e]),this.b+=1,this},S.get=function(t,e){return t&&0<(t=this.C(t)).length?String(t[0]):e},S.toString=function(){if(this.c)return this.c;if(!this.a)return "";for(var t=[],e=this.a.K(),n=0;n<e.length;n++){var r=e[n],i=encodeURIComponent(String(r));r=this.C(r);for(var o=0;o<r.length;o++){var a=i;""!==r[o]&&(a+="="+encodeURIComponent(String(r[o]))),t.push(a);}}return this.c=t.join("&")},U(function(){},function(){}),(S=En.prototype).M=null,S.$=function(t){return this.a.$(t)},S.abort=function(){this.b&&(this.b.cancel(),this.b=null),this.c=-1;},S.Ca=function(){return !1},S.Fa=function(t,e){if(this.c=t.o,0==this.M){if(!this.a.o&&(t=t.a)){var n=tr(t,"X-Client-Wire-Protocol");this.l=n||null,this.a.j&&(t=tr(t,"X-HTTP-Session-Id"))&&(this.a.I=t);}if(e){try{var r=this.a.ja.a.parse(e);}catch(t){return (e=this.a).m=this.c,void mr(e,2)}this.f=r[0];}else(e=this.a).m=this.c,mr(e,2);}else 1==this.M&&(this.g?ve(6):"11111"==e?(ve(5),this.g=!0,(!ut||10<=Number(gt))&&(this.c=200,this.b.cancel(),ve(11),fr(this.a,this,!0))):(ve(7),this.g=!1));},S.na=function(){if(this.c=this.b.o,this.b.b)0==this.M?(this.M=1,In(this)):1==this.M&&(this.g?(ve(11),fr(this.a,this,!0)):(ve(10),fr(this.a,this,!1)));else{0==this.M?ve(8):1==this.M&&ve(9);var t=this.a;t.m=this.c,mr(t,2);}},S.Y=function(){return this.a.Y()},S.ma=function(){return this.a.ma()},Dn.prototype.add=function(t){this.a.set(Nn(t),t);},Dn.prototype.C=function(){return this.a.C()};var Rn=10;function Mn(t,e){!t.a&&(J(e,"spdy")||J(e,"quic")||J(e,"h2"))&&(t.f=t.g,t.a=new Dn,t.b&&(Pn(t,t.b),t.b=null));}function _n(t){return !!t.b||!!t.a&&t.a.a.c>=t.f}function Ln(t){return t.b?1:t.a?t.a.a.c:0}function On(t,e){return t=t.b?t.b==e:!!t.a&&(e=Nn(e),Je(t.a.a.b,e))}function Pn(t,e){t.a?t.a.add(e):t.b=e;}function xn(t,e){var n;t.b&&t.b==e?t.b=null:((n=t.a)&&(n=Nn(e),n=Je(t.a.a.b,n)),n&&He(t.a.a,Nn(e)));}function Fn(t){if(null!=t.b)return t.c.concat(t.b.j);if(null==t.a||0==t.a.a.c)return G(t.c);var e=t.c;return W(t.a.C(),function(t){e=e.concat(t.j);}),e}function qn(){}function Vn(){this.a=new qn;}function Bn(t,r,e){var i=e||"";try{Ge(t,function(t,e){var n=t;L(t)&&(n=zt(t)),r.push(i+e+"="+encodeURIComponent(n));});}catch(t){throw r.push(i+"type="+encodeURIComponent("_badmap")),t}}function Un(t,e,n,r,i){try{e.onload=null,e.onerror=null,e.onabort=null,e.ontimeout=null,i(r);}catch(t){}}kn.prototype.cancel=function(){this.c=Fn(this),this.b?(this.b.cancel(),this.b=null):this.a&&0!=this.a.a.c&&(W(this.a.C(),function(t){t.cancel();}),function(t){t.b={},t.a.length=0,t.c=0;}(this.a.a));},qn.prototype.stringify=function(t){return C.JSON.stringify(t,void 0)},qn.prototype.parse=function(t){return C.JSON.parse(t,void 0)};var Kn=C.JSON.parse;function Qn(t){jt.call(this),this.headers=new ze,this.H=t||null,this.b=!1,this.s=this.a=null,this.A="",this.h=0,this.f="",this.g=this.w=this.l=this.v=!1,this.o=0,this.m=null,this.I=Wn,this.D=this.F=!1;}U(Qn,jt);var Wn="",jn=/^https?$/i,Gn=["POST","PUT"];function zn(t){return "content-type"==t.toLowerCase()}function Hn(t,e){t.b=!1,t.a&&(t.g=!0,t.a.abort(),t.g=!1),t.f=e,t.h=5,Yn(t),Xn(t);}function Yn(t){t.v||(t.v=!0,t.dispatchEvent("complete"),t.dispatchEvent("error"));}function Jn(t){if(t.b&&void 0!==I&&(!t.s[1]||4!=$n(t)||2!=t.T()))if(t.l&&4==$n(t))ae(t.Ea,0,t);else if(t.dispatchEvent("readystatechange"),4==$n(t)){t.b=!1;try{var e,n=t.T();t:switch(n){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var r=!0;break t;default:r=!1;}if(!(e=r)){var i;if(i=0===n){var o=String(t.A).match(Xe)[1]||null;if(!o&&C.self&&C.self.location){var a=C.self.location.protocol;o=a.substr(0,a.length-1);}i=!jn.test(o?o.toLowerCase():"");}e=i;}if(e)t.dispatchEvent("complete"),t.dispatchEvent("success");else{t.h=6;try{var s=2<$n(t)?t.a.statusText:"";}catch(t){s="";}t.f=s+" ["+t.T()+"]",Yn(t);}}finally{Xn(t);}}}function Xn(t,e){if(t.a){Zn(t);var n=t.a,r=t.s[0]?k:null;t.a=null,t.s=null,e||t.dispatchEvent("ready");try{n.onreadystatechange=r;}catch(t){}}}function Zn(t){t.a&&t.D&&(t.a.ontimeout=null),t.m&&(C.clearTimeout(t.m),t.m=null);}function $n(t){return t.a?t.a.readyState:0}function tr(t,e){return t.a?t.a.getResponseHeader(e):null}function er(t,e,n){t:{for(r in n){var r=!1;break t}r=!0;}if(r)return t;if(n=function(t){var n="";return tt(t,function(t,e){n+=e,n+=":",n+=t,n+="\r\n";}),n}(n),D(t)){if(e=encodeURIComponent(String(e)),e+=n=null!=n?"="+encodeURIComponent(String(n)):""){if((n=t.indexOf("#"))<0&&(n=t.length),(r=t.indexOf("?"))<0||n<r){r=n;var i="";}else i=t.substring(r+1,n);n=(t=[t.substr(0,r),i,t.substr(n)])[1],t[1]=e?n?n+"&"+e:e:n,t=t[0]+(t[1]?"?"+t[1]:"")+t[2];}return t}return on(t,e,n),t}function nr(t){this.f=[],this.F=new Cn,this.ga=this.pa=this.B=this.ha=this.a=this.I=this.j=this.V=this.g=this.J=this.i=null,this.Qa=this.P=0,this.Oa=!!A("internalChannelParams.failFast",t),this.ia=this.w=this.s=this.l=this.h=this.c=null,this.oa=!0,this.m=this.ra=this.O=-1,this.S=this.v=this.A=0,this.Na=A("internalChannelParams.baseRetryDelayMs",t)||5e3,this.Ra=A("internalChannelParams.retryDelaySeedMs",t)||1e4,this.Pa=A("internalChannelParams.forwardChannelMaxRetries",t)||2,this.qa=A("internalChannelParams.forwardChannelRequestTimeoutMs",t)||2e4,this.Ka=t&&t.zb||void 0,this.D=void 0,this.R=t&&t.supportsCrossDomainXhr||!1,this.H="",this.b=new kn(t&&t.concurrentRequestLimit),this.ja=new Vn,this.o=!t||void 0===t.backgroundChannelTest||t.backgroundChannelTest,(this.W=t&&t.fastHandshake||!1)&&!this.o&&(this.o=!0),t&&t.forceLongPolling&&(this.oa=!1),this.fa=void 0;}function rr(t){if(ir(t),3==t.u){var e=t.P++,n=$e(t.B);on(n,"SID",t.H),on(n,"RID",e),on(n,"TYPE","terminate"),ur(t,n),(e=new Me(t,e,void 0)).F=2,e.f=sn($e(n)),n=!1,C.navigator&&C.navigator.sendBeacon&&(n=C.navigator.sendBeacon(e.f.toString(),"")),!n&&C.Image&&((new Image).src=e.f,n=!0),n||(e.a=e.g.$(null),e.a.ca(e.f)),e.v=B(),Be(e);}yr(t);}function ir(t){t.w&&(t.w.abort(),t.w=null),t.a&&(t.a.cancel(),t.a=null),t.l&&(C.clearTimeout(t.l),t.l=null),pr(t),t.b.cancel(),t.h&&(N(t.h)&&C.clearTimeout(t.h),t.h=null);}function or(t,e){t.f.push(new An(t.Qa++,e)),3==t.u&&ar(t);}function ar(t){_n(t.b)||t.h||(t.h=!0,te(t.Ha,t),t.A=0);}function sr(t,e){var n;n=e?e.W:t.P++;var r=$e(t.B);on(r,"SID",t.H),on(r,"RID",n),on(r,"AID",t.O),ur(t,r),t.g&&t.i&&er(r,t.g,t.i),n=new Me(t,n,t.A+1),null===t.g&&(n.h=t.i),e&&(t.f=e.j.concat(t.f)),e=cr(t,n,1e3),n.setTimeout(Math.round(.5*t.qa)+Math.round(.5*t.qa*Math.random())),Pn(t.b,n),Pe(n,r,e);}function ur(t,n){t.c&&Ge({},function(t,e){on(n,e,t);});}function cr(t,e,n){n=Math.min(t.f.length,n);var r=t.c?q(t.c.Sa,t.c,t):null;t:for(var i=t.f,o=-1;;){var a=["count="+n];-1==o?0<n?(o=i[0].b,a.push("ofs="+o)):o=0:a.push("ofs="+o);for(var s=!0,u=0;u<n;u++){var c=i[u].b,h=i[u].a;if((c-=o)<0)o=Math.max(0,i[u].b-100),s=!1;else try{Bn(h,a,"req"+c+"_");}catch(t){r&&r(h);}}if(s){r=a.join("&");break t}}return t=t.f.splice(0,n),e.j=t,r}function hr(t){t.a||t.l||(t.S=1,te(t.Ga,t),t.v=0);}function lr(t){return !(t.a||t.l||3<=t.v)&&(t.S++,t.l=we(q(t.Ga,t),dr(t,t.v)),t.v++,!0)}function fr(t,e,n){var r=e.l;r&&Mn(t.b,r),t.ia=t.oa&&n,t.m=e.c,t.B=gr(t,null,t.ha),ar(t);}function pr(t){null!=t.s&&(C.clearTimeout(t.s),t.s=null);}function dr(t,e){var n=t.Na+Math.floor(Math.random()*t.Ra);return t.ma()||(n*=2),n*e}function mr(t,e){if(2==e){var n=null;t.c&&(n=null);var r=q(t.eb,t);n||(n=new Ze("//www.google.com/images/cleardot.gif"),C.location&&"http"==C.location.protocol||tn(n,"https"),sn(n)),function(t,e){var n=new pe;if(C.Image){var r=new Image;r.onload=V(Un,n,r,"TestLoadImage: loaded",!0,e),r.onerror=V(Un,n,r,"TestLoadImage: error",!1,e),r.onabort=V(Un,n,r,"TestLoadImage: abort",!1,e),r.ontimeout=V(Un,n,r,"TestLoadImage: timeout",!1,e),C.setTimeout(function(){r.ontimeout&&r.ontimeout();},1e4),r.src=t;}else e(!1);}(n.toString(),r);}else ve(2);t.u=0,t.c&&t.c.ta(e),yr(t),ir(t);}function yr(t){t.u=0,t.m=-1,t.c&&(0==Fn(t.b).length&&0==t.f.length||(t.b.c.length=0,G(t.f),t.f.length=0),t.c.sa());}function gr(t,e,n){var r=function(t){return t instanceof Ze?$e(t):new Ze(t,void 0)}(n);if(""!=r.b)e&&en(r,e+"."+r.b),nn(r,r.i);else{var i,o=C.location;i=e?e+"."+o.hostname:o.hostname,r=function(t,e,n,r){var i=new Ze(null,void 0);return t&&tn(i,t),e&&en(i,e),n&&nn(i,n),r&&(i.a=r),i}(o.protocol,i,+o.port,n);}return t.V&&tt(t.V,function(t,e){on(r,e,t);}),e=t.j,n=t.I,e&&n&&on(r,e,n),on(r,"VER",t.wa),ur(t,r),r}function vr(){}function br(){if(ut&&!(10<=Number(gt)))throw Error("Environmental error: no available transport.")}function wr(t,e){jt.call(this),this.a=new nr(e),this.g=t,this.m=e&&e.testUrl?e.testUrl:function(t){for(var e=t,n=1;n<arguments.length;n++){var r,i=arguments[n];if(0==i.lastIndexOf("/",0))e=i;else(r=""==e)||(r=0<=(r=e.length-1)&&e.indexOf("/",r)==r),e+=r?i:"/"+i;}return e}(this.g,"test"),this.b=e&&e.messageUrlParams||null,t=e&&e.messageHeaders||null,e&&e.clientProtocolHeaderRequired&&(t?t["X-Client-Protocol"]="webchannel":t={"X-Client-Protocol":"webchannel"}),this.a.i=t,t=e&&e.initMessageHeaders||null,e&&e.messageContentType&&(t?t["X-WebChannel-Content-Type"]=e.messageContentType:t={"X-WebChannel-Content-Type":e.messageContentType}),e&&e.xa&&(t?t["X-WebChannel-Client-Profile"]=e.xa:t={"X-WebChannel-Client-Profile":e.xa}),this.a.J=t,(t=e&&e.httpHeadersOverwriteParam)&&!z(t)&&(this.a.g=t),this.l=e&&e.supportsCrossDomainXhr||!1,this.h=e&&e.sendRawJson||!1,(e=e&&e.httpSessionIdParam)&&!z(e)&&(this.a.j=e,null!==(t=this.b)&&e in t&&(e in(t=this.b)&&delete t[e])),this.f=new Er(this);}function Tr(t){Ae.call(this);var e=t.__sm__;if(e){t:{for(var n in e){t=n;break t}t=void 0;}(this.c=t)?(t=this.c,this.data=null!==e&&t in e?e[t]:void 0):this.data=e;}else this.data=t;}function Sr(){ke.call(this),this.status=1;}function Er(t){this.a=t;}(S=Qn.prototype).ca=function(t,e,n,r){if(this.a)throw Error("[goog.net.XhrIo] Object is active with another request="+this.A+"; newUri="+t);e=e?e.toUpperCase():"GET",this.A=t,this.f="",this.h=0,this.v=!1,this.b=!0,this.a=new XMLHttpRequest,this.s=this.H?Ie(this.H):Ie(De),this.a.onreadystatechange=q(this.Ea,this);try{this.w=!0,this.a.open(e,String(t),!0),this.w=!1;}catch(t){return void Hn(this,t)}t=n||"";var i=new ze(this.headers);r&&Ge(r,function(t,e){i.set(e,t);}),r=function(t){t:{for(var e=zn,n=t.length,r=D(t)?t.split(""):t,i=0;i<n;i++)if(i in r&&e.call(void 0,r[i],i,t)){e=i;break t}e=-1;}return e<0?null:D(t)?t.charAt(e):t[e]}(i.K()),n=C.FormData&&t instanceof C.FormData,0<=Q(Gn,e)&&!r&&!n&&i.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8"),i.forEach(function(t,e){this.a.setRequestHeader(e,t);},this),this.I&&(this.a.responseType=this.I),"withCredentials"in this.a&&this.a.withCredentials!==this.F&&(this.a.withCredentials=this.F);try{Zn(this),0<this.o&&((this.D=function(t){return ut&&bt(9)&&N(t.timeout)&&void 0!==t.ontimeout}(this.a))?(this.a.timeout=this.o,this.a.ontimeout=q(this.Ba,this)):this.m=ae(this.Ba,this.o,this)),this.l=!0,this.a.send(t),this.l=!1;}catch(t){Hn(this,t);}},S.Ba=function(){void 0!==I&&this.a&&(this.f="Timed out after "+this.o+"ms, aborting",this.h=8,this.dispatchEvent("timeout"),this.abort(8));},S.abort=function(t){this.a&&this.b&&(this.b=!1,this.g=!0,this.a.abort(),this.g=!1,this.h=t||7,this.dispatchEvent("complete"),this.dispatchEvent("abort"),Xn(this));},S.G=function(){this.a&&(this.b&&(this.b=!1,this.g=!0,this.a.abort(),this.g=!1),Xn(this,!0)),Qn.N.G.call(this);},S.Ea=function(){this.j||(this.w||this.l||this.g?Jn(this):this.Za());},S.Za=function(){Jn(this);},S.T=function(){try{return 2<$n(this)?this.a.status:-1}catch(t){return -1}},S.aa=function(){try{return this.a?this.a.responseText:""}catch(t){return ""}},S.Ua=function(t){if(this.a){var e=this.a.responseText;return t&&0==e.indexOf(t)&&(e=e.substring(t.length)),Kn(e)}},S.ya=function(){return this.h},S.Xa=function(){return D(this.f)?this.f:String(this.f)},(S=nr.prototype).wa=8,S.u=1,S.Ca=function(){return 0==this.u},S.Ha=function(t){if(this.h)if(this.h=null,1==this.u){if(!t){this.P=Math.floor(1e5*Math.random()),t=this.P++;var e,n=new Me(this,t,void 0),r=this.i;if(this.J&&(r?rt(r=et(r),this.J):r=this.J),null===this.g&&(n.h=r),this.W)t:{for(var i=e=0;i<this.f.length;i++){var o=this.f[i];if(void 0===(o="__data__"in o.a&&D(o=o.a.__data__)?o.length:void 0))break;if(4096<(e+=o)){e=i;break t}if(4096===e||i===this.f.length-1){e=i+1;break t}}e=1e3;}else e=1e3;e=cr(this,n,e),on(i=$e(this.B),"RID",t),on(i,"CVER",22),this.o&&this.j&&on(i,"X-HTTP-Session-Id",this.j),ur(this,i),this.g&&r&&er(i,this.g,r),Pn(this.b,n),this.W?(on(i,"$req",e),on(i,"SID","null"),n.S=!0,Pe(n,i,null)):Pe(n,i,e),this.u=2;}}else 3==this.u&&(t?sr(this,t):0==this.f.length||_n(this.b)||sr(this));},S.Ga=function(){this.l=null,this.a=new Me(this,"rpc",this.S),null===this.g&&(this.a.h=this.i),this.a.J=0;var t=$e(this.pa);on(t,"RID","rpc"),on(t,"SID",this.H),on(t,"CI",this.ia?"0":"1"),on(t,"AID",this.O),ur(this,t),on(t,"TYPE","xmlhttp"),this.g&&this.i&&er(t,this.g,this.i),this.D&&this.a.setTimeout(this.D),xe(this.a,t,!0,this.ga);},S.Fa=function(t,e){if(0!=this.u&&(this.a==t||On(this.b,t)))if(this.m=t.o,!t.s&&On(this.b,t)&&3==this.u){try{var n=this.ja.a.parse(e);}catch(t){n=null;}if(M(n)&&3==n.length){if(0==(e=n)[0]){t:if(!this.l){if(this.a){if(!(this.a.v+3e3<t.v))break t;pr(this),this.a.cancel(),this.a=null;}lr(this),ve(18);}}else this.ra=e[1],0<this.ra-this.O&&e[2]<37500&&this.ia&&0==this.v&&!this.s&&(this.s=we(q(this.Ya,this),6e3));if(Ln(this.b)<=1&&this.fa){try{this.fa();}catch(t){}this.fa=void 0;}}else mr(this,11);}else if(!t.s&&this.a!=t||pr(this),!z(e))for(e=n=this.ja.a.parse(e),n=0;n<e.length;n++){var r=e[n];if(this.O=r[0],r=r[1],2==this.u)if("c"==r[0]){this.H=r[1],this.ga=r[2];var i=r[3];null!=i&&(this.wa=i),null!=(r=r[5])&&N(r)&&0<r&&(this.D=1.5*r),this.o&&(r=t.a)&&((i=tr(r,"X-Client-Wire-Protocol"))&&Mn(this.b,i),this.j&&(r=tr(r,"X-HTTP-Session-Id")))&&(this.I=r,on(this.B,this.j,r)),this.u=3,this.c&&this.c.va(),r=t,this.pa=gr(this,this.Y()?this.ga:null,this.ha),r.s?(xn(this.b,r),(i=this.D)&&r.setTimeout(i),r.i&&(Ke(r),Be(r)),this.a=r):hr(this),0<this.f.length&&ar(this);}else"stop"!=r[0]&&"close"!=r[0]||mr(this,7);else 3==this.u&&("stop"==r[0]||"close"==r[0]?"stop"==r[0]?mr(this,7):rr(this):"noop"!=r[0]&&this.c&&this.c.ua(r),this.v=0);}},S.Ya=function(){null!=this.s&&(this.s=null,this.a.cancel(),this.a=null,lr(this),ve(19));},S.na=function(t){var e=null;if(this.a==t){pr(this),this.a=null;var n=2;}else{if(!On(this.b,t))return;e=t.j,xn(this.b,t),n=1;}if(this.m=t.o,0!=this.u)if(t.b)1==n?(e=B()-t.v,de.dispatchEvent(new be(de,t.l?t.l.length:0,e,this.A)),ar(this)):hr(this);else{var r=t.c;if(3==r||0==r&&0<this.m||!(1==n&&function(t,e){return !(Ln(t.b)>=t.b.f-(t.h?1:0))&&(t.h?(t.f=e.j.concat(t.f),!0):!(1==t.u||2==t.u||t.A>=(t.Oa?0:t.Pa))&&(t.h=we(q(t.Ha,t,e),dr(t,t.A)),t.A++,!0))}(this,t)||2==n&&lr(this)))switch(e&&0<e.length&&(t=this.b,t.c=t.c.concat(e)),r){case 1:mr(this,5);break;case 4:mr(this,10);break;case 3:mr(this,6);break;default:mr(this,2);}}},S.eb=function(t){ve(t?2:1);},S.$=function(t){if(t&&!this.R)throw Error("Can't create secondary domain capable XhrIo object.");return (t=new Qn(this.Ka)).F=this.R,t},S.ma=function(){return !!this.c&&!0},S.Y=function(){return this.R},(S=vr.prototype).va=function(){},S.ua=function(){},S.ta=function(){},S.sa=function(){},S.Sa=function(){},br.prototype.a=function(t,e){return new wr(t,e)},U(wr,jt),(S=wr.prototype).addEventListener=function(t,e,n,r){wr.N.addEventListener.call(this,t,e,n,r);},S.removeEventListener=function(t,e,n,r){wr.N.removeEventListener.call(this,t,e,n,r);},S.Va=function(){this.a.c=this.f,this.l&&(this.a.R=!0);var t=this.a,e=this.m,n=this.g,r=this.b||void 0;ve(0),t.ha=n,t.V=r||{},t.o&&(t.F.b=[],t.F.a=!1),t.w=new En(t),null===t.g&&(t.w.h=t.i),n=e,t.g&&t.i&&(n=er(e,t.g,t.i)),(t=t.w).i=n,e=gr(t.a,null,t.i),ve(3),null!=(n=t.a.F.b)?(t.f=n[0],t.M=1,In(t)):(an(e,"MODE","init"),!t.a.o&&t.a.j&&an(e,"X-HTTP-Session-Id",t.a.j),t.b=new Me(t,void 0,void 0),t.b.h=t.h,xe(t.b,e,!1,null),t.M=0);},S.close=function(){rr(this.a);},S.Wa=function(t){if(D(t)){var e={};e.__data__=t,or(this.a,e);}else this.h?((e={}).__data__=zt(t),or(this.a,e)):or(this.a,t);},S.G=function(){this.a.c=null,delete this.f,rr(this.a),delete this.a,wr.N.G.call(this);},U(Tr,Ae),U(Sr,ke),U(Er,vr),Er.prototype.va=function(){this.a.dispatchEvent("a");},Er.prototype.ua=function(t){this.a.dispatchEvent(new Tr(t));},Er.prototype.ta=function(t){this.a.dispatchEvent(new Sr(t));},Er.prototype.sa=function(){this.a.dispatchEvent("b");};var Ir=V(function(t,e){function n(){}n.prototype=t.prototype;var r=new n;return t.apply(r,Array.prototype.slice.call(arguments,1)),r},br);br.prototype.createWebChannel=br.prototype.a,wr.prototype.send=wr.prototype.Wa,wr.prototype.open=wr.prototype.Va,wr.prototype.close=wr.prototype.close,Te.NO_ERROR=0,Te.TIMEOUT=8,Te.HTTP_ERROR=6,Se.COMPLETE="complete",(Ce.EventType=Ne).OPEN="a",Ne.CLOSE="b",Ne.ERROR="c",Ne.MESSAGE="d",jt.prototype.listen=jt.prototype.za,Qn.prototype.listenOnce=Qn.prototype.Aa,Qn.prototype.getLastError=Qn.prototype.Xa,Qn.prototype.getLastErrorCode=Qn.prototype.ya,Qn.prototype.getStatus=Qn.prototype.T,Qn.prototype.getResponseJson=Qn.prototype.Ua,Qn.prototype.getResponseText=Qn.prototype.aa,Qn.prototype.send=Qn.prototype.ca;var Cr,Dr,Nr={createWebChannelTransport:Ir,ErrorCode:Te,EventType:Se,WebChannel:Ce,XhrIo:Qn},Ar=Nr.createWebChannelTransport,kr=Nr.ErrorCode,Rr=Nr.EventType,Mr=Nr.WebChannel,_r=Nr.XhrIo,Lr=zd.SDK_VERSION,Or=new u("@firebase/firestore");function Pr(){return Or.logLevel===o.DEBUG?Cr.DEBUG:Or.logLevel===o.SILENT?Cr.SILENT:Cr.ERROR}function xr(t){switch(t){case Cr.DEBUG:Or.logLevel=o.DEBUG;break;case Cr.ERROR:Or.logLevel=o.ERROR;break;case Cr.SILENT:Or.logLevel=o.SILENT;break;default:Or.error("Firestore ("+Lr+"): Invalid value passed to `setLogLevel`");}}function Fr(t,e){for(var n=[],r=2;r<arguments.length;r++)n[r-2]=arguments[r];if(Or.logLevel<=o.DEBUG){var i=n.map(Vr);Or.debug.apply(Or,a(["Firestore ("+Lr+") ["+t+"]: "+e],i));}}function qr(t){for(var e=[],n=1;n<arguments.length;n++)e[n-1]=arguments[n];if(Or.logLevel<=o.ERROR){var r=e.map(Vr);Or.error.apply(Or,a(["Firestore ("+Lr+"): "+t],r));}}function Vr(e){if("string"==typeof e)return e;var t=Kr.getPlatform();try{return t.formatJSON(e)}catch(t){return e}}function Br(t){var e="FIRESTORE ("+Lr+") INTERNAL ASSERTION FAILED: "+t;throw qr(e),new Error(e)}function Ur(t,e){t||Br(e);}(Dr=Cr=Cr||{})[Dr.DEBUG=0]="DEBUG",Dr[Dr.ERROR=1]="ERROR",Dr[Dr.SILENT=2]="SILENT";var Kr=(Qr.setPlatform=function(t){Qr.platform&&Br("Platform already defined"),Qr.platform=t;},Qr.getPlatform=function(){return Qr.platform||Br("Platform not set"),Qr.platform},Qr);function Qr(){}function Wr(){return Kr.getPlatform().emptyByteString}var jr,Gr={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"},zr=(t(Hr,jr=Error),Hr);function Hr(t,e){var n=jr.call(this,e)||this;return n.code=t,n.message=e,n.name="FirebaseError",n.toString=function(){return n.name+": [code="+n.code+"]: "+n.message},n}function Yr(t,e){function n(){var t="This constructor is private.";throw e&&(t+=" ",t+=e),new zr(Gr.INVALID_ARGUMENT,t)}for(var r in n.prototype=t.prototype,t)t.hasOwnProperty(r)&&(n[r]=t[r]);return n}function Jr(t,e){return Object.prototype.hasOwnProperty.call(t,e)}function Xr(t,e){return void 0!==t?t:e}function Zr(t,e){for(var n in t)if(Object.prototype.hasOwnProperty.call(t,n)){var r=Number(n);isNaN(r)||e(r,t[n]);}}function $r(t,e){for(var n in t)Object.prototype.hasOwnProperty.call(t,n)&&e(n,t[n]);}function ti(t){for(var e in Ur(null!=t&&"object"==typeof t,"isEmpty() expects object parameter."),t)if(Object.prototype.hasOwnProperty.call(t,e))return !1;return !0}function ei(t,e){if(0!==e.length)throw new zr(Gr.INVALID_ARGUMENT,"Function "+t+"() does not support arguments, but was called with "+bi(e.length,"argument")+".")}function ni(t,e,n){if(e.length!==n)throw new zr(Gr.INVALID_ARGUMENT,"Function "+t+"() requires "+bi(n,"argument")+", but was called with "+bi(e.length,"argument")+".")}function ri(t,e,n){if(e.length<n)throw new zr(Gr.INVALID_ARGUMENT,"Function "+t+"() requires at least "+bi(n,"argument")+", but was called with "+bi(e.length,"argument")+".")}function ii(t,e,n,r){if(e.length<n||e.length>r)throw new zr(Gr.INVALID_ARGUMENT,"Function "+t+"() requires between "+n+" and "+r+" arguments, but was called with "+bi(e.length,"argument")+".")}function oi(t,e,n,r){li(t,e,vi(n)+" argument",r);}function ai(t,e,n,r){void 0!==r&&oi(t,e,n,r);}function si(t,e,n,r){li(t,e,n+" option",r);}function ui(t,e,n,r){void 0!==r&&si(t,e,n,r);}function ci(t,e,n,r,i){void 0!==r&&function(t,e,n,r,i){if(!(r instanceof Array))throw new zr(Gr.INVALID_ARGUMENT,"Function "+t+"() requires its "+e+" option to be an array, but it was: "+pi(r));for(var o=0;o<r.length;++o)if(!i(r[o]))throw new zr(Gr.INVALID_ARGUMENT,"Function "+t+"() requires all "+e+" elements to be "+n+", but the value at index "+o+" was: "+pi(r[o]))}(t,e,n,r,i);}function hi(t,e,n,r,i){void 0!==r&&function(t,e,n,r,i){for(var o=[],a=0,s=i;a<s.length;a++){var u=s[a];if(u===r)return;o.push(pi(u));}var c=pi(r);throw new zr(Gr.INVALID_ARGUMENT,"Invalid value "+c+" provided to function "+t+'() for option "'+n+'". Acceptable values: '+o.join(", "))}(t,0,n,r,i);}function li(t,e,n,r){if(!("object"===e?fi(r):"non-empty string"===e?"string"==typeof r&&""!==r:typeof r===e)){var i=pi(r);throw new zr(Gr.INVALID_ARGUMENT,"Function "+t+"() requires its "+n+" to be of type "+e+", but it was: "+i)}}function fi(t){return "object"==typeof t&&null!==t&&(Object.getPrototypeOf(t)===Object.prototype||null===Object.getPrototypeOf(t))}function pi(t){if(void 0===t)return "undefined";if(null===t)return "null";if("string"==typeof t)return 20<t.length&&(t=t.substring(0,20)+"..."),JSON.stringify(t);if("number"==typeof t||"boolean"==typeof t)return ""+t;if("object"!=typeof t)return "function"==typeof t?"a function":Br("Unknown wrong type: "+typeof t);if(t instanceof Array)return "an array";var e=function(t){if(t.constructor){var e=/function\s+([^\s(]+)\s*\(/.exec(t.constructor.toString());if(e&&1<e.length)return e[1]}return null}(t);return e?"a custom "+e+" object":"an object"}function di(t,e,n){if(void 0===n)throw new zr(Gr.INVALID_ARGUMENT,"Function "+t+"() requires a valid "+vi(e)+" argument, but it was undefined.")}function mi(n,t,r){$r(t,function(t,e){if(r.indexOf(t)<0)throw new zr(Gr.INVALID_ARGUMENT,"Unknown option '"+t+"' passed to function "+n+"(). Available options: "+r.join(", "))});}function yi(t,e,n,r){var i=pi(r);return new zr(Gr.INVALID_ARGUMENT,"Function "+t+"() requires its "+vi(n)+" argument to be a "+e+", but it was: "+i)}function gi(t,e,n){if(n<=0)throw new zr(Gr.INVALID_ARGUMENT,'Function "'+t+'()" requires its '+vi(e)+" argument to be a positive number, but it was: "+n+".")}function vi(t){switch(t){case 1:return "first";case 2:return "second";case 3:return "third";default:return t+"th"}}function bi(t,e){return t+" "+e+(1===t?"":"s")}var wi=(Ti.newId=function(){for(var t="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",e="",n=0;n<20;n++)e+=t.charAt(Math.floor(Math.random()*t.length));return Ur(20===e.length,"Invalid auto ID: "+e),e},Ti);function Ti(){}function Si(t,e){return t<e?-1:e<t?1:0}function Ei(t,e){if(t.length!==e.length)return !1;for(var n=0;n<t.length;n++)if(!t[n].isEqual(e[n]))return !1;return !0}function Ii(t){return t+"\0"}function Ci(){if("undefined"==typeof Uint8Array)throw new zr(Gr.UNIMPLEMENTED,"Uint8Arrays are not available in this environment.")}function Di(){if(!Kr.getPlatform().base64Available)throw new zr(Gr.UNIMPLEMENTED,"Blobs are unavailable in Firestore in this environment.")}var Ni=(Ai.fromBase64String=function(t){ni("Blob.fromBase64String",arguments,1),oi("Blob.fromBase64String","string",1,t),Di();try{return new Ai(Kr.getPlatform().atob(t))}catch(t){throw new zr(Gr.INVALID_ARGUMENT,"Failed to construct Blob from Base64 string: "+t)}},Ai.fromUint8Array=function(t){if(ni("Blob.fromUint8Array",arguments,1),Ci(),!(t instanceof Uint8Array))throw yi("Blob.fromUint8Array","Uint8Array",1,t);return new Ai(Array.prototype.map.call(t,function(t){return String.fromCharCode(t)}).join(""))},Ai.prototype.toBase64=function(){return ni("Blob.toBase64",arguments,0),Di(),Kr.getPlatform().btoa(this._binaryString)},Ai.prototype.toUint8Array=function(){ni("Blob.toUint8Array",arguments,0),Ci();for(var t=new Uint8Array(this._binaryString.length),e=0;e<this._binaryString.length;e++)t[e]=this._binaryString.charCodeAt(e);return t},Ai.prototype.toString=function(){return "Blob(base64: "+this.toBase64()+")"},Ai.prototype.isEqual=function(t){return this._binaryString===t._binaryString},Ai.prototype._compareTo=function(t){return Si(this._binaryString,t._binaryString)},Ai);function Ai(t){Di(),this._binaryString=t;}var ki=Yr(Ni,"Use Blob.fromUint8Array() or Blob.fromBase64String() instead."),Ri=function(t,e,n,r,i){this.databaseId=t,this.persistenceKey=e,this.host=n,this.ssl=r,this.forceLongPolling=i;},Mi="(default)",_i=(Object.defineProperty(Li.prototype,"isDefaultDatabase",{get:function(){return this.database===Mi},enumerable:!0,configurable:!0}),Li.prototype.isEqual=function(t){return t instanceof Li&&t.projectId===this.projectId&&t.database===this.database},Li.prototype.compareTo=function(t){return Si(this.projectId,t.projectId)||Si(this.database,t.database)},Li);function Li(t,e){this.projectId=t,this.database=e||Mi;}var Oi=(Pi.prototype.setPreviousValue=function(t){return this.previousValue=Math.max(t,this.previousValue),this.previousValue},Pi.prototype.next=function(){var t=++this.previousValue;return this.writeNewSequenceNumber&&this.writeNewSequenceNumber(t),t},Pi.INVALID=-1,Pi);function Pi(t,e){var n=this;this.previousValue=t,e&&(e.sequenceNumberHandler=function(t){return n.setPreviousValue(t)},this.writeNewSequenceNumber=function(t){return e.writeSequenceNumber(t)});}var xi="__name__",Fi=(Object.defineProperty(qi.prototype,"length",{get:function(){return this.len},enumerable:!0,configurable:!0}),qi.prototype.isEqual=function(t){return 0===qi.comparator(this,t)},qi.prototype.child=function(t){var e=this.segments.slice(this.offset,this.limit());return t instanceof qi?t.forEach(function(t){e.push(t);}):e.push(t),this.construct(e)},qi.prototype.limit=function(){return this.offset+this.length},qi.prototype.popFirst=function(t){return t=void 0===t?1:t,Ur(this.length>=t,"Can't call popFirst() with less segments"),this.construct(this.segments,this.offset+t,this.length-t)},qi.prototype.popLast=function(){return Ur(!this.isEmpty(),"Can't call popLast() on empty path"),this.construct(this.segments,this.offset,this.length-1)},qi.prototype.firstSegment=function(){return Ur(!this.isEmpty(),"Can't call firstSegment() on empty path"),this.segments[this.offset]},qi.prototype.lastSegment=function(){return this.get(this.length-1)},qi.prototype.get=function(t){return Ur(t<this.length,"Index out of range"),this.segments[this.offset+t]},qi.prototype.isEmpty=function(){return 0===this.length},qi.prototype.isPrefixOf=function(t){if(t.length<this.length)return !1;for(var e=0;e<this.length;e++)if(this.get(e)!==t.get(e))return !1;return !0},qi.prototype.isImmediateParentOf=function(t){if(this.length+1!==t.length)return !1;for(var e=0;e<this.length;e++)if(this.get(e)!==t.get(e))return !1;return !0},qi.prototype.forEach=function(t){for(var e=this.offset,n=this.limit();e<n;e++)t(this.segments[e]);},qi.prototype.toArray=function(){return this.segments.slice(this.offset,this.limit())},qi.comparator=function(t,e){for(var n=Math.min(t.length,e.length),r=0;r<n;r++){var i=t.get(r),o=e.get(r);if(i<o)return -1;if(o<i)return 1}return t.length<e.length?-1:t.length>e.length?1:0},qi);function qi(t,e,n){void 0===e?e=0:e>t.length&&Br("offset "+e+" out of range "+t.length),void 0===n?n=t.length-e:n>t.length-e&&Br("length "+n+" out of range "+(t.length-e)),this.segments=t,this.offset=e,this.len=n;}var Vi,Bi=(t(Ui,Vi=Fi),Ui.prototype.construct=function(t,e,n){return new Ui(t,e,n)},Ui.prototype.canonicalString=function(){return this.toArray().join("/")},Ui.prototype.toString=function(){return this.canonicalString()},Ui.fromString=function(t){if(0<=t.indexOf("//"))throw new zr(Gr.INVALID_ARGUMENT,"Invalid path ("+t+"). Paths must not contain // in them.");return new Ui(t.split("/").filter(function(t){return 0<t.length}))},Ui.EMPTY_PATH=new Ui([]),Ui);function Ui(){return null!==Vi&&Vi.apply(this,arguments)||this}var Ki,Qi=/^[_a-zA-Z][_a-zA-Z0-9]*$/,Wi=(t(ji,Ki=Fi),ji.prototype.construct=function(t,e,n){return new ji(t,e,n)},ji.isValidIdentifier=function(t){return Qi.test(t)},ji.prototype.canonicalString=function(){return this.toArray().map(function(t){return t=t.replace("\\","\\\\").replace("`","\\`"),ji.isValidIdentifier(t)||(t="`"+t+"`"),t}).join(".")},ji.prototype.toString=function(){return this.canonicalString()},ji.prototype.isKeyField=function(){return 1===this.length&&this.get(0)===xi},ji.keyField=function(){return new ji([xi])},ji.fromServerFormat=function(t){for(var e=[],n="",r=0,i=function(){if(0===n.length)throw new zr(Gr.INVALID_ARGUMENT,"Invalid field path ("+t+"). Paths must not be empty, begin with '.', end with '.', or contain '..'");e.push(n),n="";},o=!1;r<t.length;){var a=t[r];if("\\"===a){if(r+1===t.length)throw new zr(Gr.INVALID_ARGUMENT,"Path has trailing escape character: "+t);var s=t[r+1];if("\\"!==s&&"."!==s&&"`"!==s)throw new zr(Gr.INVALID_ARGUMENT,"Path has invalid escape sequence: "+t);n+=s,r+=2;}else"`"===a?o=!o:"."!==a||o?n+=a:i(),r++;}if(i(),o)throw new zr(Gr.INVALID_ARGUMENT,"Unterminated ` in path: "+t);return new ji(e)},ji.EMPTY_PATH=new ji([]),ji);function ji(){return null!==Ki&&Ki.apply(this,arguments)||this}var Gi=(zi.prototype.hasCollectionId=function(t){return 2<=this.path.length&&this.path.get(this.path.length-2)===t},zi.prototype.isEqual=function(t){return null!==t&&0===Bi.comparator(this.path,t.path)},zi.prototype.toString=function(){return this.path.toString()},zi.comparator=function(t,e){return Bi.comparator(t.path,e.path)},zi.isDocumentKey=function(t){return t.length%2==0},zi.fromSegments=function(t){return new zi(new Bi(t.slice()))},zi.fromPathString=function(t){return new zi(Bi.fromString(t))},zi.EMPTY=new zi(new Bi([])),zi);function zi(t){this.path=t,Ur(zi.isDocumentKey(t),"Invalid DocumentKey with an odd number of segments: "+t.toArray().join("/"));}var Hi,Yi,Ji=function(){var n=this;this.promise=new Promise(function(t,e){n.resolve=t,n.reject=e;});};(Yi=Hi=Hi||{}).All="all",Yi.ListenStreamIdle="listen_stream_idle",Yi.ListenStreamConnectionBackoff="listen_stream_connection_backoff",Yi.WriteStreamIdle="write_stream_idle",Yi.WriteStreamConnectionBackoff="write_stream_connection_backoff",Yi.OnlineStateTimeout="online_state_timeout",Yi.ClientMetadataRefresh="client_metadata_refresh",Yi.LruGarbageCollection="lru_garbage_collection",Yi.RetryTransaction="retry_transaction";var Xi=(Zi.createAndSchedule=function(t,e,n,r,i){var o=new Zi(t,e,Date.now()+n,r,i);return o.start(n),o},Zi.prototype.start=function(t){var e=this;this.timerHandle=setTimeout(function(){return e.handleDelayElapsed()},t);},Zi.prototype.skipDelay=function(){return this.handleDelayElapsed()},Zi.prototype.cancel=function(t){null!==this.timerHandle&&(this.clearTimeout(),this.deferred.reject(new zr(Gr.CANCELLED,"Operation cancelled"+(t?": "+t:""))));},Zi.prototype.handleDelayElapsed=function(){var e=this;this.asyncQueue.enqueueAndForget(function(){return null!==e.timerHandle?(e.clearTimeout(),e.op().then(function(t){return e.deferred.resolve(t)})):Promise.resolve()});},Zi.prototype.clearTimeout=function(){null!==this.timerHandle&&(this.removalCallback(this),clearTimeout(this.timerHandle),this.timerHandle=null);},Zi);function Zi(t,e,n,r,i){this.asyncQueue=t,this.timerId=e,this.targetTimeMs=n,this.op=r,this.removalCallback=i,this.deferred=new Ji,this.then=this.deferred.promise.then.bind(this.deferred.promise),this.catch=this.deferred.promise.catch.bind(this.deferred.promise),this.deferred.promise.catch(function(t){});}var $i=(Object.defineProperty(to.prototype,"isShuttingDown",{get:function(){return this._isShuttingDown},enumerable:!0,configurable:!0}),to.prototype.enqueueAndForget=function(t){this.enqueue(t);},to.prototype.enqueueAndForgetEvenAfterShutdown=function(t){this.verifyNotFailed(),this.enqueueInternal(t);},to.prototype.enqueueEvenAfterShutdown=function(t){return this.verifyNotFailed(),this.enqueueInternal(t)},to.prototype.enqueueAndInitiateShutdown=function(e){return p(this,void 0,void 0,function(){return m(this,function(t){switch(t.label){case 0:return this.verifyNotFailed(),this._isShuttingDown?[3,2]:(this._isShuttingDown=!0,[4,this.enqueueEvenAfterShutdown(e)]);case 1:t.sent(),t.label=2;case 2:return [2]}})})},to.prototype.enqueue=function(t){return this.verifyNotFailed(),this._isShuttingDown?new Promise(function(t){}):this.enqueueInternal(t)},to.prototype.enqueueInternal=function(t){var n=this,e=this.tail.then(function(){return n.operationInProgress=!0,t().catch(function(t){n.failure=t,n.operationInProgress=!1;var e=t.stack||t.message||"";throw qr("INTERNAL UNHANDLED ERROR: ",e),e.indexOf("Firestore Test Simulated Error")<0&&setTimeout(function(){throw t},0),t}).then(function(t){return n.operationInProgress=!1,t})});return this.tail=e},to.prototype.enqueueAfterDelay=function(t,e,n){var r=this;this.verifyNotFailed(),Ur(0<=e,"Attempted to schedule an operation with a negative delay of "+e),-1<this.timerIdsToSkip.indexOf(t)&&(e=0);var i=Xi.createAndSchedule(this,t,e,n,function(t){return r.removeDelayedOperation(t)});return this.delayedOperations.push(i),i},to.prototype.verifyNotFailed=function(){this.failure&&Br("AsyncQueue is already failed: "+(this.failure.stack||this.failure.message));},to.prototype.verifyOperationInProgress=function(){Ur(this.operationInProgress,"verifyOpInProgress() called when no op in progress on this queue.");},to.prototype.drain=function(){return this.enqueueEvenAfterShutdown(function(){return Promise.resolve()})},to.prototype.containsDelayedOperation=function(t){for(var e=0,n=this.delayedOperations;e<n.length;e++)if(n[e].timerId===t)return !0;return !1},to.prototype.runDelayedOperationsEarly=function(r){var i=this;return this.drain().then(function(){Ur(r===Hi.All||i.containsDelayedOperation(r),"Attempted to drain to missing operation "+r),i.delayedOperations.sort(function(t,e){return t.targetTimeMs-e.targetTimeMs});for(var t=0,e=i.delayedOperations;t<e.length;t++){var n=e[t];if(n.skipDelay(),r!==Hi.All&&n.timerId===r)break}return i.drain()})},to.prototype.skipDelaysForTimerId=function(t){this.timerIdsToSkip.push(t);},to.prototype.removeDelayedOperation=function(t){var e=this.delayedOperations.indexOf(t);Ur(0<=e,"Delayed operation not found."),this.delayedOperations.splice(e,1);},to);function to(){this.tail=Promise.resolve(),this._isShuttingDown=!1,this.delayedOperations=[],this.failure=null,this.operationInProgress=!1,this.timerIdsToSkip=[];}var eo="",no="",ro="",io="";function oo(t){for(var e="",n=0;n<t.length;n++)0<e.length&&(e=so(e)),e=ao(t.get(n),e);return so(e)}function ao(t,e){for(var n=e,r=t.length,i=0;i<r;i++){var o=t.charAt(i);switch(o){case"\0":n+=eo+ro;break;case eo:n+=eo+io;break;default:n+=o;}}return n}function so(t){return t+eo+no}function uo(t){var e=t.length;if(Ur(2<=e,"Invalid path "+t),2===e)return Ur(t.charAt(0)===eo&&t.charAt(1)===no,"Non-empty path "+t+" had length 2"),Bi.EMPTY_PATH;for(var n=e-2,r=[],i="",o=0;o<e;){var a=t.indexOf(eo,o);switch((a<0||n<a)&&Br('Invalid encoded resource path: "'+t+'"'),t.charAt(a+1)){case no:var s=t.substring(o,a),u=void 0;0===i.length?u=s:(u=i+=s,i=""),r.push(u);break;case ro:i+=t.substring(o,a),i+="\0";break;case io:i+=t.substring(o,a+1);break;default:Br('Invalid encoded resource path: "'+t+'"');}o=a+2;}return new Bi(r)}var co=(ho.now=function(){return ho.fromMillis(Date.now())},ho.fromDate=function(t){return ho.fromMillis(t.getTime())},ho.fromMillis=function(t){var e=Math.floor(t/1e3);return new ho(e,1e6*(t-1e3*e))},ho.prototype.toDate=function(){return new Date(this.toMillis())},ho.prototype.toMillis=function(){return 1e3*this.seconds+this.nanoseconds/1e6},ho.prototype._compareTo=function(t){return this.seconds===t.seconds?Si(this.nanoseconds,t.nanoseconds):Si(this.seconds,t.seconds)},ho.prototype.isEqual=function(t){return t.seconds===this.seconds&&t.nanoseconds===this.nanoseconds},ho.prototype.toString=function(){return "Timestamp(seconds="+this.seconds+", nanoseconds="+this.nanoseconds+")"},ho);function ho(t,e){if(this.seconds=t,(this.nanoseconds=e)<0)throw new zr(Gr.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+e);if(1e9<=e)throw new zr(Gr.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+e);if(t<-62135596800)throw new zr(Gr.INVALID_ARGUMENT,"Timestamp seconds out of range: "+t);if(253402300800<=t)throw new zr(Gr.INVALID_ARGUMENT,"Timestamp seconds out of range: "+t)}var lo=(fo.fromMicroseconds=function(t){var e=Math.floor(t/1e6);return new fo(new co(e,t%1e6*1e3))},fo.fromTimestamp=function(t){return new fo(t)},fo.forDeletedDoc=function(){return fo.MIN},fo.prototype.compareTo=function(t){return this.timestamp._compareTo(t.timestamp)},fo.prototype.isEqual=function(t){return this.timestamp.isEqual(t.timestamp)},fo.prototype.toMicroseconds=function(){return 1e6*this.timestamp.seconds+this.timestamp.nanoseconds/1e3},fo.prototype.toString=function(){return "SnapshotVersion("+this.timestamp.toString()+")"},fo.prototype.toTimestamp=function(){return this.timestamp},fo.MIN=new fo(new co(0,0)),fo);function fo(t){this.timestamp=t;}var po=(mo.prototype.insert=function(t,e){return new mo(this.comparator,this.root.insert(t,e,this.comparator).copy(null,null,vo.BLACK,null,null))},mo.prototype.remove=function(t){return new mo(this.comparator,this.root.remove(t,this.comparator).copy(null,null,vo.BLACK,null,null))},mo.prototype.get=function(t){for(var e=this.root;!e.isEmpty();){var n=this.comparator(t,e.key);if(0===n)return e.value;n<0?e=e.left:0<n&&(e=e.right);}return null},mo.prototype.indexOf=function(t){for(var e=0,n=this.root;!n.isEmpty();){var r=this.comparator(t,n.key);if(0===r)return e+n.left.size;n=r<0?n.left:(e+=n.left.size+1,n.right);}return -1},mo.prototype.isEmpty=function(){return this.root.isEmpty()},Object.defineProperty(mo.prototype,"size",{get:function(){return this.root.size},enumerable:!0,configurable:!0}),mo.prototype.minKey=function(){return this.root.minKey()},mo.prototype.maxKey=function(){return this.root.maxKey()},mo.prototype.inorderTraversal=function(t){return this.root.inorderTraversal(t)},mo.prototype.forEach=function(n){this.inorderTraversal(function(t,e){return n(t,e),!1});},mo.prototype.toString=function(){var n=[];return this.inorderTraversal(function(t,e){return n.push(t+":"+e),!1}),"{"+n.join(", ")+"}"},mo.prototype.reverseTraversal=function(t){return this.root.reverseTraversal(t)},mo.prototype.getIterator=function(){return new yo(this.root,null,this.comparator,!1)},mo.prototype.getIteratorFrom=function(t){return new yo(this.root,t,this.comparator,!1)},mo.prototype.getReverseIterator=function(){return new yo(this.root,null,this.comparator,!0)},mo.prototype.getReverseIteratorFrom=function(t){return new yo(this.root,t,this.comparator,!0)},mo);function mo(t,e){this.comparator=t,this.root=e||vo.EMPTY;}var yo=(go.prototype.getNext=function(){Ur(0<this.nodeStack.length,"getNext() called on iterator when hasNext() is false.");var t=this.nodeStack.pop(),e={key:t.key,value:t.value};if(this.isReverse)for(t=t.left;!t.isEmpty();)this.nodeStack.push(t),t=t.right;else for(t=t.right;!t.isEmpty();)this.nodeStack.push(t),t=t.left;return e},go.prototype.hasNext=function(){return 0<this.nodeStack.length},go.prototype.peek=function(){if(0===this.nodeStack.length)return null;var t=this.nodeStack[this.nodeStack.length-1];return {key:t.key,value:t.value}},go);function go(t,e,n,r){this.isReverse=r,this.nodeStack=[];for(var i=1;!t.isEmpty();)if(i=e?n(t.key,e):1,r&&(i*=-1),i<0)t=this.isReverse?t.left:t.right;else{if(0===i){this.nodeStack.push(t);break}this.nodeStack.push(t),t=this.isReverse?t.right:t.left;}}var vo=(bo.prototype.copy=function(t,e,n,r,i){return new bo(null!=t?t:this.key,null!=e?e:this.value,null!=n?n:this.color,null!=r?r:this.left,null!=i?i:this.right)},bo.prototype.isEmpty=function(){return !1},bo.prototype.inorderTraversal=function(t){return this.left.inorderTraversal(t)||t(this.key,this.value)||this.right.inorderTraversal(t)},bo.prototype.reverseTraversal=function(t){return this.right.reverseTraversal(t)||t(this.key,this.value)||this.left.reverseTraversal(t)},bo.prototype.min=function(){return this.left.isEmpty()?this:this.left.min()},bo.prototype.minKey=function(){return this.min().key},bo.prototype.maxKey=function(){return this.right.isEmpty()?this.key:this.right.maxKey()},bo.prototype.insert=function(t,e,n){var r=this,i=n(t,r.key);return (r=i<0?r.copy(null,null,null,r.left.insert(t,e,n),null):0===i?r.copy(null,e,null,null,null):r.copy(null,null,null,null,r.right.insert(t,e,n))).fixUp()},bo.prototype.removeMin=function(){if(this.left.isEmpty())return bo.EMPTY;var t=this;return t.left.isRed()||t.left.left.isRed()||(t=t.moveRedLeft()),(t=t.copy(null,null,null,t.left.removeMin(),null)).fixUp()},bo.prototype.remove=function(t,e){var n,r=this;if(e(t,r.key)<0)r.left.isEmpty()||r.left.isRed()||r.left.left.isRed()||(r=r.moveRedLeft()),r=r.copy(null,null,null,r.left.remove(t,e),null);else{if(r.left.isRed()&&(r=r.rotateRight()),r.right.isEmpty()||r.right.isRed()||r.right.left.isRed()||(r=r.moveRedRight()),0===e(t,r.key)){if(r.right.isEmpty())return bo.EMPTY;n=r.right.min(),r=r.copy(n.key,n.value,null,null,r.right.removeMin());}r=r.copy(null,null,null,null,r.right.remove(t,e));}return r.fixUp()},bo.prototype.isRed=function(){return this.color},bo.prototype.fixUp=function(){var t=this;return t.right.isRed()&&!t.left.isRed()&&(t=t.rotateLeft()),t.left.isRed()&&t.left.left.isRed()&&(t=t.rotateRight()),t.left.isRed()&&t.right.isRed()&&(t=t.colorFlip()),t},bo.prototype.moveRedLeft=function(){var t=this.colorFlip();return t.right.left.isRed()&&(t=(t=(t=t.copy(null,null,null,null,t.right.rotateRight())).rotateLeft()).colorFlip()),t},bo.prototype.moveRedRight=function(){var t=this.colorFlip();return t.left.left.isRed()&&(t=(t=t.rotateRight()).colorFlip()),t},bo.prototype.rotateLeft=function(){var t=this.copy(null,null,bo.RED,null,this.right.left);return this.right.copy(null,null,this.color,t,null)},bo.prototype.rotateRight=function(){var t=this.copy(null,null,bo.RED,this.left.right,null);return this.left.copy(null,null,this.color,null,t)},bo.prototype.colorFlip=function(){var t=this.left.copy(null,null,!this.left.color,null,null),e=this.right.copy(null,null,!this.right.color,null,null);return this.copy(null,null,!this.color,t,e)},bo.prototype.checkMaxDepth=function(){var t=this.check();return Math.pow(2,t)<=this.size+1},bo.prototype.check=function(){if(this.isRed()&&this.left.isRed())throw Br("Red node has red child("+this.key+","+this.value+")");if(this.right.isRed())throw Br("Right child of ("+this.key+","+this.value+") is red");var t=this.left.check();if(t!==this.right.check())throw Br("Black depths differ");return t+(this.isRed()?0:1)},bo.EMPTY=null,bo.RED=!0,bo.BLACK=!1,bo);function bo(t,e,n,r,i){this.key=t,this.value=e,this.color=null!=n?n:bo.RED,this.left=null!=r?r:bo.EMPTY,this.right=null!=i?i:bo.EMPTY,this.size=this.left.size+1+this.right.size;}var wo=(Object.defineProperty(To.prototype,"key",{get:function(){throw Br("LLRBEmptyNode has no key.")},enumerable:!0,configurable:!0}),Object.defineProperty(To.prototype,"value",{get:function(){throw Br("LLRBEmptyNode has no value.")},enumerable:!0,configurable:!0}),Object.defineProperty(To.prototype,"color",{get:function(){throw Br("LLRBEmptyNode has no color.")},enumerable:!0,configurable:!0}),Object.defineProperty(To.prototype,"left",{get:function(){throw Br("LLRBEmptyNode has no left child.")},enumerable:!0,configurable:!0}),Object.defineProperty(To.prototype,"right",{get:function(){throw Br("LLRBEmptyNode has no right child.")},enumerable:!0,configurable:!0}),To.prototype.copy=function(t,e,n,r,i){return this},To.prototype.insert=function(t,e,n){return new vo(t,e)},To.prototype.remove=function(t,e){return this},To.prototype.isEmpty=function(){return !0},To.prototype.inorderTraversal=function(t){return !1},To.prototype.reverseTraversal=function(t){return !1},To.prototype.minKey=function(){return null},To.prototype.maxKey=function(){return null},To.prototype.isRed=function(){return !1},To.prototype.checkMaxDepth=function(){return !0},To.prototype.check=function(){return 0},To);function To(){this.size=0;}vo.EMPTY=new wo;var So=(Eo.fromMapKeys=function(t){var e=new Eo(t.comparator);return t.forEach(function(t){e=e.add(t);}),e},Eo.prototype.has=function(t){return null!==this.data.get(t)},Eo.prototype.first=function(){return this.data.minKey()},Eo.prototype.last=function(){return this.data.maxKey()},Object.defineProperty(Eo.prototype,"size",{get:function(){return this.data.size},enumerable:!0,configurable:!0}),Eo.prototype.indexOf=function(t){return this.data.indexOf(t)},Eo.prototype.forEach=function(n){this.data.inorderTraversal(function(t,e){return n(t),!1});},Eo.prototype.forEachInRange=function(t,e){for(var n=this.data.getIteratorFrom(t[0]);n.hasNext();){var r=n.getNext();if(0<=this.comparator(r.key,t[1]))return;e(r.key);}},Eo.prototype.forEachWhile=function(t,e){var n;for(n=void 0!==e?this.data.getIteratorFrom(e):this.data.getIterator();n.hasNext();)if(!t(n.getNext().key))return},Eo.prototype.firstAfterOrEqual=function(t){var e=this.data.getIteratorFrom(t);return e.hasNext()?e.getNext().key:null},Eo.prototype.getIterator=function(){return new Io(this.data.getIterator())},Eo.prototype.getIteratorFrom=function(t){return new Io(this.data.getIteratorFrom(t))},Eo.prototype.add=function(t){return this.copy(this.data.remove(t).insert(t,!0))},Eo.prototype.delete=function(t){return this.has(t)?this.copy(this.data.remove(t)):this},Eo.prototype.isEmpty=function(){return this.data.isEmpty()},Eo.prototype.unionWith=function(t){var e=this;return t.forEach(function(t){e=e.add(t);}),e},Eo.prototype.isEqual=function(t){if(!(t instanceof Eo))return !1;if(this.size!==t.size)return !1;for(var e=this.data.getIterator(),n=t.data.getIterator();e.hasNext();){var r=e.getNext().key,i=n.getNext().key;if(0!==this.comparator(r,i))return !1}return !0},Eo.prototype.toArray=function(){var e=[];return this.forEach(function(t){e.push(t);}),e},Eo.prototype.toString=function(){var e=[];return this.forEach(function(t){return e.push(t)}),"SortedSet("+e.toString()+")"},Eo.prototype.copy=function(t){var e=new Eo(this.comparator);return e.data=t,e},Eo);function Eo(t){this.comparator=t,this.data=new po(this.comparator);}var Io=(Co.prototype.getNext=function(){return this.iter.getNext().key},Co.prototype.hasNext=function(){return this.iter.hasNext()},Co);function Co(t){this.iter=t;}var Do=new po(Gi.comparator);function No(){return Do}function Ao(){return No()}var ko=new po(Gi.comparator);function Ro(){return ko}var Mo=new po(Gi.comparator);function _o(){return Mo}var Lo=new So(Gi.comparator);function Oo(){for(var t=[],e=0;e<arguments.length;e++)t[e]=arguments[e];for(var n=Lo,r=0,i=t;r<i.length;r++){var o=i[r];n=n.add(o);}return n}var Po=new So(Si);function xo(){return Po}var Fo=(qo.prototype.applyToRemoteDocument=function(t,e,n){e&&Ur(e.key.isEqual(t),"applyToRemoteDocument: key "+t+" should match maybeDoc key\n        "+e.key);var r=n.mutationResults;Ur(r.length===this.mutations.length,"Mismatch between mutations length\n      ("+this.mutations.length+") and mutation results length\n      ("+r.length+").");for(var i=0;i<this.mutations.length;i++){var o=this.mutations[i];if(o.key.isEqual(t)){var a=r[i];e=o.applyToRemoteDocument(e,a);}}return e},qo.prototype.applyToLocalView=function(t,e){e&&Ur(e.key.isEqual(t),"applyToLocalDocument: key "+t+" should match maybeDoc key\n        "+e.key);for(var n=0,r=this.baseMutations;n<r.length;n++)(s=r[n]).key.isEqual(t)&&(e=s.applyToLocalView(e,e,this.localWriteTime));for(var i=e,o=0,a=this.mutations;o<a.length;o++){var s;(s=a[o]).key.isEqual(t)&&(e=s.applyToLocalView(e,i,this.localWriteTime));}return e},qo.prototype.applyToLocalDocumentSet=function(n){var r=this,i=n;return this.mutations.forEach(function(t){var e=r.applyToLocalView(t.key,n.get(t.key));e&&(i=i.insert(t.key,e));}),i},qo.prototype.keys=function(){return this.mutations.reduce(function(t,e){return t.add(e.key)},Oo())},qo.prototype.isEqual=function(t){return this.batchId===t.batchId&&Ei(this.mutations,t.mutations)&&Ei(this.baseMutations,t.baseMutations)},qo);function qo(t,e,n,r){this.batchId=t,this.localWriteTime=e,this.baseMutations=n,Ur(0<(this.mutations=r).length,"Cannot create an empty mutation batch");}var Vo=(Bo.from=function(t,e,n,r){Ur(t.mutations.length===n.length,"Mutations sent "+t.mutations.length+" must equal results received "+n.length);for(var i=_o(),o=t.mutations,a=0;a<o.length;a++)i=i.insert(o[a].key,n[a].version);return new Bo(t,e,n,r,i)},Bo);function Bo(t,e,n,r,i){this.batch=t,this.commitVersion=e,this.mutationResults=n,this.streamToken=r,this.docVersions=i;}var Uo=(Ko.prototype.catch=function(t){return this.next(void 0,t)},Ko.prototype.next=function(r,i){var o=this;return this.callbackAttached&&Br("Called next() or catch() twice for PersistencePromise"),this.callbackAttached=!0,this.isDone?this.error?this.wrapFailure(i,this.error):this.wrapSuccess(r,this.result):new Ko(function(e,n){o.nextCallback=function(t){o.wrapSuccess(r,t).next(e,n);},o.catchCallback=function(t){o.wrapFailure(i,t).next(e,n);};})},Ko.prototype.toPromise=function(){var n=this;return new Promise(function(t,e){n.next(t,e);})},Ko.prototype.wrapUserFunction=function(t){try{var e=t();return e instanceof Ko?e:Ko.resolve(e)}catch(t){return Ko.reject(t)}},Ko.prototype.wrapSuccess=function(t,e){return t?this.wrapUserFunction(function(){return t(e)}):Ko.resolve(e)},Ko.prototype.wrapFailure=function(t,e){return t?this.wrapUserFunction(function(){return t(e)}):Ko.reject(e)},Ko.resolve=function(n){return new Ko(function(t,e){t(n);})},Ko.reject=function(n){return new Ko(function(t,e){e(n);})},Ko.waitFor=function(t){return new Ko(function(e,n){var r=0,i=0,o=!1;t.forEach(function(t){++r,t.next(function(){++i,o&&i===r&&e();},function(t){return n(t)});}),o=!0,i===r&&e();})},Ko.or=function(t){for(var n=Ko.resolve(!1),e=function(e){n=n.next(function(t){return t?Ko.resolve(t):e()});},r=0,i=t;r<i.length;r++)e(i[r]);return n},Ko.forEach=function(t,n){var r=this,i=[];return t.forEach(function(t,e){i.push(n.call(r,t,e));}),this.waitFor(i)},Ko);function Ko(t){var e=this;this.nextCallback=null,this.catchCallback=null,this.result=void 0,this.error=void 0,this.isDone=!1,this.callbackAttached=!1,t(function(t){e.isDone=!0,e.result=t,e.nextCallback&&e.nextCallback(t);},function(t){e.isDone=!0,e.error=t,e.catchCallback&&e.catchCallback(t);});}var Qo="SimpleDb",Wo=(jo.openOrCreate=function(o,t,a){return Ur(jo.isAvailable(),"IndexedDB not supported in current environment."),Fr(Qo,"Opening database:",o),new Uo(function(n,r){var i=window.indexedDB.open(o,t);i.onsuccess=function(t){var e=t.target.result;n(new jo(e));},i.onblocked=function(){r(new zr(Gr.FAILED_PRECONDITION,"Cannot upgrade IndexedDB schema while another tab is open. Close all tabs that access Firestore and reload this page to proceed."));},i.onerror=function(t){var e=t.target.error;"VersionError"===e.name?r(new zr(Gr.FAILED_PRECONDITION,"A newer version of the Firestore SDK was previously used and so the persisted data is not compatible with the version of the SDK you are now using. The SDK will operate with persistence disabled. If you need persistence, please re-upgrade to a newer version of the SDK or else clear the persisted IndexedDB data for your app to start fresh.")):r(e);},i.onupgradeneeded=function(t){Fr(Qo,'Database "'+o+'" requires upgrade from version:',t.oldVersion);var e=t.target.result;a.createOrUpgrade(e,i.transaction,t.oldVersion,cu).next(function(){Fr(Qo,"Database upgrade to version "+cu+" complete");});};}).toPromise()},jo.delete=function(t){return Fr(Qo,"Removing database:",t),Zo(window.indexedDB.deleteDatabase(t)).toPromise()},jo.isAvailable=function(){if("undefined"==typeof window||null==window.indexedDB)return !1;if(jo.isMockPersistence())return !0;if(void 0===window.navigator)return !1;var t=h(),e=jo.getIOSVersion(t),n=0<e&&e<10,r=jo.getAndroidVersion(t),i=0<r&&r<4.5;return !(0<t.indexOf("MSIE ")||0<t.indexOf("Trident/")||0<t.indexOf("Edge/")||n||i)},jo.isMockPersistence=function(){var t;return "undefined"!=typeof process&&"YES"===(null===(t=process.env)||void 0===t?void 0:t.USE_MOCK_PERSISTENCE)},jo.getStore=function(t,e){return t.store(e)},jo.getIOSVersion=function(t){var e=t.match(/i(?:phone|pad|pod) os ([\d_]+)/i),n=e?e[1].split("_").slice(0,2).join("."):"-1";return Number(n)},jo.getAndroidVersion=function(t){var e=t.match(/Android ([\d.]+)/i),n=e?e[1].split(".").slice(0,2).join("."):"-1";return Number(n)},jo.prototype.setVersionChangeListener=function(e){this.db.onversionchange=function(t){return e(t)};},jo.prototype.runTransaction=function(r,c,h){return p(this,void 0,void 0,function(){var o,a,s,e,u,n;return m(this,function(t){switch(t.label){case 0:o=r.startsWith("readonly"),a=r.endsWith("idempotent"),s=0,e=function(){var e,n,r,i;return m(this,function(t){switch(t.label){case 0:++s,e=Ho.open(u.db,o?"readonly":"readwrite",c),t.label=1;case 1:return t.trys.push([1,3,,4]),(n=h(e).catch(function(t){return e.abort(t),Uo.reject(t)}).toPromise()).catch(function(){}),[4,e.completionPromise];case 2:return t.sent(),[2,{value:n}];case 3:return r=t.sent(),i=a&&"FirebaseError"!==r.name&&s<3,Fr(Qo,"Transaction failed with error: %s. Retrying: %s.",r.message,i),i?[3,4]:[2,{value:Promise.reject(r)}];case 4:return [2]}})},u=this,t.label=1;case 1:return [5,e()];case 2:return "object"==typeof(n=t.sent())?[2,n.value]:[3,1];case 3:return [2]}})})},jo.prototype.close=function(){this.db.close();},jo);function jo(t){this.db=t,12.2===jo.getIOSVersion(h())&&qr("Firestore persistence suffers from a bug in iOS 12.2 Safari that may cause your app to stop working. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.");}var Go=(Object.defineProperty(zo.prototype,"isDone",{get:function(){return this.shouldStop},enumerable:!0,configurable:!0}),Object.defineProperty(zo.prototype,"skipToKey",{get:function(){return this.nextKey},enumerable:!0,configurable:!0}),Object.defineProperty(zo.prototype,"cursor",{set:function(t){this.dbCursor=t;},enumerable:!0,configurable:!0}),zo.prototype.done=function(){this.shouldStop=!0;},zo.prototype.skip=function(t){this.nextKey=t;},zo.prototype.delete=function(){return Zo(this.dbCursor.delete())},zo);function zo(t){this.dbCursor=t,this.shouldStop=!1,this.nextKey=null;}var Ho=(Yo.open=function(t,e,n){return new Yo(t.transaction(n,e))},Object.defineProperty(Yo.prototype,"completionPromise",{get:function(){return this.completionDeferred.promise},enumerable:!0,configurable:!0}),Yo.prototype.abort=function(t){t&&this.completionDeferred.reject(t),this.aborted||(Fr(Qo,"Aborting transaction:",t?t.message:"Client-initiated abort"),this.aborted=!0,this.transaction.abort());},Yo.prototype.store=function(t){var e=this.transaction.objectStore(t);return Ur(!!e,"Object store not part of transaction: "+t),new Jo(e)},Yo);function Yo(t){var n=this;this.transaction=t,this.aborted=!1,this.completionDeferred=new Ji,this.transaction.oncomplete=function(){n.completionDeferred.resolve();},this.transaction.onabort=function(){t.error?n.completionDeferred.reject(t.error):n.completionDeferred.resolve();},this.transaction.onerror=function(t){var e=ta(t.target.error);n.completionDeferred.reject(e);};}var Jo=(Xo.prototype.put=function(t,e){return Zo(void 0!==e?(Fr(Qo,"PUT",this.store.name,t,e),this.store.put(e,t)):(Fr(Qo,"PUT",this.store.name,"<auto-key>",t),this.store.put(t)))},Xo.prototype.add=function(t){return Fr(Qo,"ADD",this.store.name,t,t),Zo(this.store.add(t))},Xo.prototype.get=function(e){var n=this;return Zo(this.store.get(e)).next(function(t){return void 0===t&&(t=null),Fr(Qo,"GET",n.store.name,e,t),t})},Xo.prototype.delete=function(t){return Fr(Qo,"DELETE",this.store.name,t),Zo(this.store.delete(t))},Xo.prototype.count=function(){return Fr(Qo,"COUNT",this.store.name),Zo(this.store.count())},Xo.prototype.loadAll=function(t,e){var n=this.cursor(this.options(t,e)),r=[];return this.iterateCursor(n,function(t,e){r.push(e);}).next(function(){return r})},Xo.prototype.deleteAll=function(t,e){Fr(Qo,"DELETE ALL",this.store.name);var n=this.options(t,e);n.keysOnly=!1;var r=this.cursor(n);return this.iterateCursor(r,function(t,e,n){return n.delete()})},Xo.prototype.iterate=function(t,e){var n;e?n=t:(n={},e=t);var r=this.cursor(n);return this.iterateCursor(r,e)},Xo.prototype.iterateSerial=function(i){var t=this.cursor({});return new Uo(function(n,r){t.onerror=function(t){var e=ta(t.target.error);r(e);},t.onsuccess=function(t){var e=t.target.result;e?i(e.primaryKey,e.value).next(function(t){t?e.continue():n();}):n();};})},Xo.prototype.iterateCursor=function(t,a){var s=[];return new Uo(function(o,e){t.onerror=function(t){e(t.target.error);},t.onsuccess=function(t){var e=t.target.result;if(e){var n=new Go(e),r=a(e.primaryKey,e.value,n);if(r instanceof Uo){var i=r.catch(function(t){return n.done(),Uo.reject(t)});s.push(i);}n.isDone?o():null===n.skipToKey?e.continue():e.continue(n.skipToKey);}else o();};}).next(function(){return Uo.waitFor(s)})},Xo.prototype.options=function(t,e){var n=void 0;return void 0!==t&&("string"==typeof t?n=t:(Ur(void 0===e,"3rd argument must not be defined if 2nd is a range."),e=t)),{index:n,range:e}},Xo.prototype.cursor=function(t){var e="next";if(t.reverse&&(e="prev"),t.index){var n=this.store.index(t.index);return t.keysOnly?n.openKeyCursor(t.range,e):n.openCursor(t.range,e)}return this.store.openCursor(t.range,e)},Xo);function Xo(t){this.store=t;}function Zo(t){return new Uo(function(n,r){t.onsuccess=function(t){var e=t.target.result;n(e);},t.onerror=function(t){var e=ta(t.target.error);r(e);};})}var $o=!1;function ta(t){var e=Wo.getIOSVersion(h());if(12.2<=e&&e<13){var n="An internal error was encountered in the Indexed Database server";if(0<=t.message.indexOf(n)){var r=new zr("internal","IOS_INDEXEDDB_BUG1: IndexedDb has thrown '"+n+"'. This is likely due to an unavoidable bug in iOS. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.");return $o||($o=!0,setTimeout(function(){throw r},0)),r}}return t}var ea=(na.forUser=function(t,e,n,r){return Ur(""!==t.uid,"UserID must not be an empty string."),new na(t.isAuthenticated()?t.uid:"",e,n,r)},na.prototype.checkEmpty=function(t){var r=!0,e=IDBKeyRange.bound([this.userId,Number.NEGATIVE_INFINITY],[this.userId,Number.POSITIVE_INFINITY]);return aa(t).iterate({index:gu.userMutationsIndex,range:e},function(t,e,n){r=!1,n.done();}).next(function(){return r})},na.prototype.acknowledgeBatch=function(e,t,n){return this.getMutationQueueMetadata(e).next(function(t){return t.lastStreamToken=oa(n),ua(e).put(t)})},na.prototype.getLastStreamToken=function(t){return this.getMutationQueueMetadata(t).next(function(t){return t.lastStreamToken})},na.prototype.setLastStreamToken=function(e,n){return this.getMutationQueueMetadata(e).next(function(t){return t.lastStreamToken=oa(n),ua(e).put(t)})},na.prototype.addMutationBatch=function(c,h,l,f){var p=this,d=sa(c),m=aa(c);return m.add({}).next(function(t){Ur("number"==typeof t,"Auto-generated key is not a number");for(var e=new Fo(t,h,l,f),n=p.serializer.toDbMutationBatch(p.userId,e),r=[],i=new So(function(t,e){return Si(t.canonicalString(),e.canonicalString())}),o=0,a=f;o<a.length;o++){var s=a[o],u=bu.key(p.userId,s.key.path,t);i=i.add(s.key.path.popLast()),r.push(m.put(n)),r.push(d.put(u,bu.PLACEHOLDER));}return i.forEach(function(t){r.push(p.indexManager.addToCollectionParentIndex(c,t));}),c.addOnCommittedListener(function(){p.documentKeysByBatchId[t]=e.keys();}),Uo.waitFor(r).next(function(){return e})})},na.prototype.lookupMutationBatch=function(t,e){var n=this;return aa(t).get(e).next(function(t){return t?(Ur(t.userId===n.userId,"Unexpected user '"+t.userId+"' for mutation batch "+e),n.serializer.fromDbMutationBatch(t)):null})},na.prototype.lookupMutationKeys=function(t,n){var r=this;return this.documentKeysByBatchId[n]?Uo.resolve(this.documentKeysByBatchId[n]):this.lookupMutationBatch(t,n).next(function(t){if(t){var e=t.keys();return r.documentKeysByBatchId[n]=e}return null})},na.prototype.getNextMutationBatchAfterBatchId=function(t,e){var r=this,i=e+1,n=IDBKeyRange.lowerBound([this.userId,i]),o=null;return aa(t).iterate({index:gu.userMutationsIndex,range:n},function(t,e,n){e.userId===r.userId&&(Ur(e.batchId>=i,"Should have found mutation after "+i),o=r.serializer.fromDbMutationBatch(e)),n.done();}).next(function(){return o})},na.prototype.getHighestUnacknowledgedBatchId=function(t){var e=IDBKeyRange.upperBound([this.userId,Number.POSITIVE_INFINITY]),r=-1;return aa(t).iterate({index:gu.userMutationsIndex,range:e,reverse:!0},function(t,e,n){r=e.batchId,n.done();}).next(function(){return r})},na.prototype.getAllMutationBatches=function(t){var e=this,n=IDBKeyRange.bound([this.userId,-1],[this.userId,Number.POSITIVE_INFINITY]);return aa(t).loadAll(gu.userMutationsIndex,n).next(function(t){return t.map(function(t){return e.serializer.fromDbMutationBatch(t)})})},na.prototype.getAllMutationBatchesAffectingDocumentKey=function(s,u){var c=this,t=bu.prefixForPath(this.userId,u.path),e=IDBKeyRange.lowerBound(t),h=[];return sa(s).iterate({range:e},function(e,t,n){var r=e[0],i=e[1],o=e[2],a=uo(i);if(r===c.userId&&u.path.isEqual(a))return aa(s).get(o).next(function(t){if(!t)throw Br("Dangling document-mutation reference found: "+e+" which points to "+o);Ur(t.userId===c.userId,"Unexpected user '"+t.userId+"' for mutation batch "+o),h.push(c.serializer.fromDbMutationBatch(t));});n.done();}).next(function(){return h})},na.prototype.getAllMutationBatchesAffectingDocumentKeys=function(r,t){var u=this,c=new So(Si),i=[];return t.forEach(function(s){var t=bu.prefixForPath(u.userId,s.path),e=IDBKeyRange.lowerBound(t),n=sa(r).iterate({range:e},function(t,e,n){var r=t[0],i=t[1],o=t[2],a=uo(i);r===u.userId&&s.path.isEqual(a)?c=c.add(o):n.done();});i.push(n);}),Uo.waitFor(i).next(function(){return u.lookupMutationBatches(r,c)})},na.prototype.getAllMutationBatchesAffectingQuery=function(t,e){var s=this;Ur(!e.isDocumentQuery(),"Document queries shouldn't go down this path"),Ur(!e.isCollectionGroupQuery(),"CollectionGroup queries should be handled in LocalDocumentsView");var u=e.path,c=u.length+1,n=bu.prefixForPath(this.userId,u),r=IDBKeyRange.lowerBound(n),h=new So(Si);return sa(t).iterate({range:r},function(t,e,n){var r=t[0],i=t[1],o=t[2],a=uo(i);r===s.userId&&u.isPrefixOf(a)?a.length===c&&(h=h.add(o)):n.done();}).next(function(){return s.lookupMutationBatches(t,h)})},na.prototype.lookupMutationBatches=function(t,e){var n=this,r=[],i=[];return e.forEach(function(e){i.push(aa(t).get(e).next(function(t){if(null===t)throw Br("Dangling document-mutation reference found, which points to "+e);Ur(t.userId===n.userId,"Unexpected user '"+t.userId+"' for mutation batch "+e),r.push(n.serializer.fromDbMutationBatch(t));}));}),Uo.waitFor(i).next(function(){return r})},na.prototype.removeMutationBatch=function(e,n){var r=this;return ia(e.simpleDbTransaction,this.userId,n).next(function(t){return e.addOnCommittedListener(function(){r.removeCachedMutationKeys(n.batchId);}),Uo.forEach(t,function(t){return r.referenceDelegate.removeMutationReference(e,t)})})},na.prototype.removeCachedMutationKeys=function(t){delete this.documentKeysByBatchId[t];},na.prototype.performConsistencyCheck=function(n){var o=this;return this.checkEmpty(n).next(function(t){if(!t)return Uo.resolve();var e=IDBKeyRange.lowerBound(bu.prefixForUser(o.userId)),i=[];return sa(n).iterate({range:e},function(t,e,n){if(t[0]===o.userId){var r=uo(t[1]);i.push(r);}else n.done();}).next(function(){Ur(0===i.length,"Document leak -- detected dangling mutation references when queue is empty. Dangling keys: "+i.map(function(t){return t.canonicalString()}));})})},na.prototype.containsKey=function(t,e){return ra(t,this.userId,e)},na.prototype.getMutationQueueMetadata=function(t){var e=this;return ua(t).get(this.userId).next(function(t){return t||new mu(e.userId,-1,"")})},na);function na(t,e,n,r){this.userId=t,this.serializer=e,this.indexManager=n,this.referenceDelegate=r,this.documentKeysByBatchId={};}function ra(t,o,e){var n=bu.prefixForPath(o,e.path),a=n[1],r=IDBKeyRange.lowerBound(n),s=!1;return sa(t).iterate({range:r,keysOnly:!0},function(t,e,n){var r=t[0],i=t[1];t[2];r===o&&i===a&&(s=!0),n.done();}).next(function(){return s})}function ia(t,e,n){var r=t.store(gu.store),i=t.store(bu.store),o=[],a=IDBKeyRange.only(n.batchId),s=0,u=r.iterate({range:a},function(t,e,n){return s++,n.delete()});o.push(u.next(function(){Ur(1===s,"Dangling document-mutation reference found: Missing batch "+n.batchId);}));for(var c=[],h=0,l=n.mutations;h<l.length;h++){var f=l[h],p=bu.key(e,f.key.path,n.batchId);o.push(i.delete(p)),c.push(f.key);}return Uo.waitFor(o).next(function(){return c})}function oa(t){return t instanceof Uint8Array?(Ur(Wo.isMockPersistence(),"Persisting non-string stream tokens is only supported with mock persistence."),t.toString()):t}function aa(t){return fc.getStore(t,gu.store)}function sa(t){return fc.getStore(t,bu.store)}function ua(t){return fc.getStore(t,mu.store)}var ca,ha;(ha=ca=ca||{})[ha.QueryCache=0]="QueryCache",ha[ha.SyncEngine=1]="SyncEngine";var la=(fa.prototype.next=function(){var t=this.nextId;return this.nextId+=2,t},fa.prototype.after=function(t){return this.seek(t+2),this.next()},fa.prototype.seek=function(t){Ur((1&t)===this.generatorId,"Cannot supply target ID from different generator ID"),this.nextId=t;},fa.forTargetCache=function(){return new fa(ca.QueryCache,2)},fa.forSyncEngine=function(){return new fa(ca.SyncEngine)},fa);function fa(t,e){Ur((1&(this.generatorId=t))===t,"Generator ID "+t+" contains more than 1 reserved bits"),this.seek(void 0!==e?e:this.generatorId);}var pa=(da.prototype.allocateTargetId=function(e){var n=this;return this.retrieveMetadata(e).next(function(t){return t.highestTargetId=n.targetIdGenerator.after(t.highestTargetId),n.saveMetadata(e,t).next(function(){return t.highestTargetId})})},da.prototype.getLastRemoteSnapshotVersion=function(t){return this.retrieveMetadata(t).next(function(t){return lo.fromTimestamp(new co(t.lastRemoteSnapshotVersion.seconds,t.lastRemoteSnapshotVersion.nanoseconds))})},da.prototype.getHighestSequenceNumber=function(t){return ga(t.simpleDbTransaction)},da.prototype.setTargetsMetadata=function(e,n,r){var i=this;return this.retrieveMetadata(e).next(function(t){return t.highestListenSequenceNumber=n,r&&(t.lastRemoteSnapshotVersion=r.toTimestamp()),n>t.highestListenSequenceNumber&&(t.highestListenSequenceNumber=n),i.saveMetadata(e,t)})},da.prototype.addTargetData=function(e,n){var r=this;return this.saveTargetData(e,n).next(function(){return r.retrieveMetadata(e).next(function(t){return t.targetCount+=1,r.updateMetadataFromTargetData(n,t),r.saveMetadata(e,t)})})},da.prototype.updateTargetData=function(t,e){return this.saveTargetData(t,e)},da.prototype.removeTargetData=function(e,t){var n=this;return this.removeMatchingKeysForTargetId(e,t.targetId).next(function(){return ma(e).delete(t.targetId)}).next(function(){return n.retrieveMetadata(e)}).next(function(t){return Ur(0<t.targetCount,"Removing from an empty target cache"),t.targetCount-=1,n.saveMetadata(e,t)})},da.prototype.removeTargets=function(r,i,o){var a=this,s=0,u=[];return ma(r).iterate(function(t,e){var n=a.serializer.fromDbTarget(e);n.sequenceNumber<=i&&null===o.get(n.targetId)&&(s++,u.push(a.removeTargetData(r,n)));}).next(function(){return Uo.waitFor(u)}).next(function(){return s})},da.prototype.forEachTarget=function(t,r){var i=this;return ma(t).iterate(function(t,e){var n=i.serializer.fromDbTarget(e);r(n);})},da.prototype.retrieveMetadata=function(t){return ya(t.simpleDbTransaction)},da.prototype.saveMetadata=function(t,e){return function(t){return fc.getStore(t,Mu.store)}(t).put(Mu.key,e)},da.prototype.saveTargetData=function(t,e){return ma(t).put(this.serializer.toDbTarget(e))},da.prototype.updateMetadataFromTargetData=function(t,e){var n=!1;return t.targetId>e.highestTargetId&&(e.highestTargetId=t.targetId,n=!0),t.sequenceNumber>e.highestListenSequenceNumber&&(e.highestListenSequenceNumber=t.sequenceNumber,n=!0),n},da.prototype.getTargetCount=function(t){return this.retrieveMetadata(t).next(function(t){return t.targetCount})},da.prototype.getTargetData=function(t,i){var o=this,e=i.canonicalId(),n=IDBKeyRange.bound([e,Number.NEGATIVE_INFINITY],[e,Number.POSITIVE_INFINITY]),a=null;return ma(t).iterate({range:n,index:Nu.queryTargetsIndexName},function(t,e,n){var r=o.serializer.fromDbTarget(e);i.isEqual(r.target)&&(a=r,n.done());}).next(function(){return a})},da.prototype.addMatchingKeys=function(n,t,r){var i=this,o=[],a=va(n);return t.forEach(function(t){var e=oo(t.path);o.push(a.put(new ku(r,e))),o.push(i.referenceDelegate.addReference(n,t));}),Uo.waitFor(o)},da.prototype.removeMatchingKeys=function(n,t,r){var i=this,o=va(n);return Uo.forEach(t,function(t){var e=oo(t.path);return Uo.waitFor([o.delete([r,e]),i.referenceDelegate.removeReference(n,t)])})},da.prototype.removeMatchingKeysForTargetId=function(t,e){var n=va(t),r=IDBKeyRange.bound([e],[e+1],!1,!0);return n.delete(r)},da.prototype.getMatchingKeysForTargetId=function(t,e){var n=IDBKeyRange.bound([e],[e+1],!1,!0),r=va(t),o=Oo();return r.iterate({range:n,keysOnly:!0},function(t,e,n){var r=uo(t[1]),i=new Gi(r);o=o.add(i);}).next(function(){return o})},da.prototype.containsKey=function(t,e){var n=oo(e.path),r=IDBKeyRange.bound([n],[Ii(n)],!1,!0),i=0;return va(t).iterate({index:ku.documentTargetsIndex,keysOnly:!0,range:r},function(t,e,n){var r=t[0];t[1],0!==r&&(i++,n.done());}).next(function(){return 0<i})},da.prototype.getTargetDataForTarget=function(t,e){var n=this;return ma(t).get(e).next(function(t){return t?n.serializer.fromDbTarget(t):null})},da);function da(t,e){this.referenceDelegate=t,this.serializer=e,this.targetIdGenerator=la.forTargetCache();}function ma(t){return fc.getStore(t,Nu.store)}function ya(t){return Wo.getStore(t,Mu.store).get(Mu.key).next(function(t){return Ur(null!==t,"Missing metadata row."),t})}function ga(t){return ya(t).next(function(t){return t.highestListenSequenceNumber})}function va(t){return fc.getStore(t,ku.store)}var ba=(wa.fromSet=function(t){return new wa(t)},wa.fromArray=function(t){var e=new So(Wi.comparator);return t.forEach(function(t){return e=e.add(t)}),new wa(e)},wa.prototype.covers=function(e){var n=!1;return this.fields.forEach(function(t){t.isPrefixOf(e)&&(n=!0);}),n},wa.prototype.isEqual=function(t){return this.fields.isEqual(t.fields)},wa);function wa(t){this.fields=t;}var Ta=(Sa.prototype.isEqual=function(t){return this.field.isEqual(t.field)&&this.transform.isEqual(t.transform)},Sa);function Sa(t,e){this.field=t,this.transform=e;}var Ea,Ia,Ca=function(t,e){this.version=t,this.transformResults=e;};(Ia=Ea=Ea||{})[Ia.Set=0]="Set",Ia[Ia.Patch=1]="Patch",Ia[Ia.Transform=2]="Transform",Ia[Ia.Delete=3]="Delete";var Da=(Na.exists=function(t){return new Na(void 0,t)},Na.updateTime=function(t){return new Na(t)},Object.defineProperty(Na.prototype,"isNone",{get:function(){return void 0===this.updateTime&&void 0===this.exists},enumerable:!0,configurable:!0}),Na.prototype.isValidFor=function(t){return void 0!==this.updateTime?t instanceof Vs&&t.version.isEqual(this.updateTime):void 0!==this.exists?this.exists===t instanceof Vs:(Ur(this.isNone,"Precondition should be empty"),!0)},Na.prototype.isEqual=function(t){return function(t,e){return null!=t?!(!e||!t.isEqual(e)):t===e}(this.updateTime,t.updateTime)&&this.exists===t.exists},Na.NONE=new Na,Na);function Na(t,e){this.updateTime=t,this.exists=e,Ur(void 0===t||void 0===e,'Precondition can specify "exists" or "updateTime" but not both');}var Aa=(ka.prototype.verifyKeyMatches=function(t){null!=t&&Ur(t.key.isEqual(this.key),"Can only apply a mutation to a document with the same key");},ka.getPostMutationVersion=function(t){return t instanceof Vs?t.version:lo.MIN},ka);function ka(){}var Ra,Ma=(t(_a,Ra=Aa),_a.prototype.applyToRemoteDocument=function(t,e){this.verifyKeyMatches(t),Ur(null==e.transformResults,"Transform results received by SetMutation.");var n=e.version;return new Vs(this.key,n,{hasCommittedMutations:!0},this.value)},_a.prototype.applyToLocalView=function(t,e,n){if(this.verifyKeyMatches(t),!this.precondition.isValidFor(t))return t;var r=Aa.getPostMutationVersion(t);return new Vs(this.key,r,{hasLocalMutations:!0},this.value)},_a.prototype.extractBaseValue=function(t){return null},_a.prototype.isEqual=function(t){return t instanceof _a&&this.key.isEqual(t.key)&&this.value.isEqual(t.value)&&this.precondition.isEqual(t.precondition)},_a);function _a(t,e,n){var r=Ra.call(this)||this;return r.key=t,r.value=e,r.precondition=n,r.type=Ea.Set,r}var La,Oa=(t(Pa,La=Aa),Pa.prototype.applyToRemoteDocument=function(t,e){if(this.verifyKeyMatches(t),Ur(null==e.transformResults,"Transform results received by PatchMutation."),!this.precondition.isValidFor(t))return new js(this.key,e.version);var n=this.patchDocument(t);return new Vs(this.key,e.version,{hasCommittedMutations:!0},n)},Pa.prototype.applyToLocalView=function(t,e,n){if(this.verifyKeyMatches(t),!this.precondition.isValidFor(t))return t;var r=Aa.getPostMutationVersion(t),i=this.patchDocument(t);return new Vs(this.key,r,{hasLocalMutations:!0},i)},Pa.prototype.extractBaseValue=function(t){return null},Pa.prototype.isEqual=function(t){return t instanceof Pa&&this.key.isEqual(t.key)&&this.fieldMask.isEqual(t.fieldMask)&&this.precondition.isEqual(t.precondition)},Pa.prototype.patchDocument=function(t){var e;return e=t instanceof Vs?t.data():Ms.EMPTY,this.patchObject(e)},Pa.prototype.patchObject=function(n){var r=this;return this.fieldMask.fields.forEach(function(t){if(!t.isEmpty()){var e=r.data.field(t);n=null!==e?n.set(t,e):n.delete(t);}}),n},Pa);function Pa(t,e,n,r){var i=La.call(this)||this;return i.key=t,i.data=e,i.fieldMask=n,i.precondition=r,i.type=Ea.Patch,i}var xa,Fa=(t(qa,xa=Aa),qa.prototype.applyToRemoteDocument=function(t,e){if(this.verifyKeyMatches(t),Ur(null!=e.transformResults,"Transform results missing for TransformMutation."),!this.precondition.isValidFor(t))return new js(this.key,e.version);var n=this.requireDocument(t),r=this.serverTransformResults(t,e.transformResults),i=e.version,o=this.transformObject(n.data(),r);return new Vs(this.key,i,{hasCommittedMutations:!0},o)},qa.prototype.applyToLocalView=function(t,e,n){if(this.verifyKeyMatches(t),!this.precondition.isValidFor(t))return t;var r=this.requireDocument(t),i=this.localTransformResults(n,t,e),o=this.transformObject(r.data(),i);return new Vs(this.key,r.version,{hasLocalMutations:!0},o)},qa.prototype.extractBaseValue=function(t){for(var e=null,n=0,r=this.fieldTransforms;n<r.length;n++){var i=r[n],o=t instanceof Vs?t.field(i.field):void 0,a=i.transform.computeBaseValue(o||null);null!=a&&(e=null==e?Ms.EMPTY.set(i.field,a):e.set(i.field,a));}return e},qa.prototype.isEqual=function(t){return t instanceof qa&&this.key.isEqual(t.key)&&Ei(this.fieldTransforms,t.fieldTransforms)&&this.precondition.isEqual(t.precondition)},qa.prototype.requireDocument=function(t){return Ur(t instanceof Vs,"Unknown MaybeDocument type "+t),Ur(t.key.isEqual(this.key),"Can only transform a document with the same key"),t},qa.prototype.serverTransformResults=function(t,e){var n=[];Ur(this.fieldTransforms.length===e.length,"server transform result count ("+e.length+") should match field transform count ("+this.fieldTransforms.length+")");for(var r=0;r<e.length;r++){var i=this.fieldTransforms[r],o=i.transform,a=null;t instanceof Vs&&(a=t.field(i.field)),n.push(o.applyToRemoteDocument(a,e[r]));}return n},qa.prototype.localTransformResults=function(t,e,n){for(var r=[],i=0,o=this.fieldTransforms;i<o.length;i++){var a=o[i],s=a.transform,u=null;e instanceof Vs&&(u=e.field(a.field)),null===u&&n instanceof Vs&&(u=n.field(a.field)),r.push(s.applyToLocalView(u,t));}return r},qa.prototype.transformObject=function(t,e){Ur(e.length===this.fieldTransforms.length,"TransformResults length mismatch.");for(var n=0;n<this.fieldTransforms.length;n++){var r=this.fieldTransforms[n].field;t=t.set(r,e[n]);}return t},qa);function qa(t,e){var n=xa.call(this)||this;return n.key=t,n.fieldTransforms=e,n.type=Ea.Transform,n.precondition=Da.exists(!0),n}var Va,Ba,Ua,Ka,Qa,Wa=(t(ja,Va=Aa),ja.prototype.applyToRemoteDocument=function(t,e){return this.verifyKeyMatches(t),Ur(null==e.transformResults,"Transform results received by DeleteMutation."),new Ks(this.key,e.version,{hasCommittedMutations:!0})},ja.prototype.applyToLocalView=function(t,e,n){return this.verifyKeyMatches(t),this.precondition.isValidFor(t)?(t&&Ur(t.key.isEqual(this.key),"Can only apply mutation to document with same key"),new Ks(this.key,lo.forDeletedDoc())):t},ja.prototype.extractBaseValue=function(t){return null},ja.prototype.isEqual=function(t){return t instanceof ja&&this.key.isEqual(t.key)&&this.precondition.isEqual(t.precondition)},ja);function ja(t,e){var n=Va.call(this)||this;return n.key=t,n.precondition=e,n.type=Ea.Delete,n}(Ua=Ba=Ba||{})[Ua.NullValue=0]="NullValue",Ua[Ua.BooleanValue=1]="BooleanValue",Ua[Ua.NumberValue=2]="NumberValue",Ua[Ua.TimestampValue=3]="TimestampValue",Ua[Ua.StringValue=4]="StringValue",Ua[Ua.BlobValue=5]="BlobValue",Ua[Ua.RefValue=6]="RefValue",Ua[Ua.GeoPointValue=7]="GeoPointValue",Ua[Ua.ArrayValue=8]="ArrayValue",Ua[Ua.ObjectValue=9]="ObjectValue",(Qa=Ka=Ka||{})[Qa.Default=0]="Default",Qa[Qa.Estimate=1]="Estimate",Qa[Qa.Previous=2]="Previous";var Ga=(za.fromSnapshotOptions=function(t,e){switch(t.serverTimestamps){case"estimate":return new za(Ka.Estimate,e);case"previous":return new za(Ka.Previous,e);case"none":case void 0:return new za(Ka.Default,e);default:return Br("fromSnapshotOptions() called with invalid options.")}},za);function za(t,e){this.serverTimestampBehavior=t,this.timestampsInSnapshots=e;}var Ha=(Ya.prototype.toString=function(){var t=this.value();return null===t?"null":t.toString()},Ya.prototype.defaultCompareTo=function(t){return Ur(this.typeOrder!==t.typeOrder,"Default compareTo should not be used for values of same type."),Si(this.typeOrder,t.typeOrder)},Ya);function Ya(){}var Ja,Xa=(t(Za,Ja=Ha),Za.prototype.value=function(t){return null},Za.prototype.isEqual=function(t){return t instanceof Za},Za.prototype.compareTo=function(t){return t instanceof Za?0:this.defaultCompareTo(t)},Za.INSTANCE=new Za,Za);function Za(){var t=Ja.call(this)||this;return t.typeOrder=Ba.NullValue,t.internalValue=null,t}var $a,ts=(t(es,$a=Ha),es.prototype.value=function(t){return this.internalValue},es.prototype.isEqual=function(t){return t instanceof es&&this.internalValue===t.internalValue},es.prototype.compareTo=function(t){return t instanceof es?Si(this,t):this.defaultCompareTo(t)},es.of=function(t){return t?es.TRUE:es.FALSE},es.TRUE=new es(!0),es.FALSE=new es(!1),es);function es(t){var e=$a.call(this)||this;return e.internalValue=t,e.typeOrder=Ba.BooleanValue,e}var ns,rs=(t(is,ns=Ha),is.prototype.value=function(t){return this.internalValue},is.prototype.compareTo=function(t){return t instanceof is?function(t,e){return t<e?-1:e<t?1:t===e?0:isNaN(t)?isNaN(e)?0:-1:1}(this.internalValue,t.internalValue):this.defaultCompareTo(t)},is);function is(t){var e=ns.call(this)||this;return e.internalValue=t,e.typeOrder=Ba.NumberValue,e}function os(t,e){return t===e?0!==t||1/t==1/e:t!=t&&e!=e}var as,ss=(t(us,as=rs),us.prototype.isEqual=function(t){return t instanceof us&&os(this.internalValue,t.internalValue)},us);function us(){return null!==as&&as.apply(this,arguments)||this}var cs,hs=(t(ls,cs=rs),ls.prototype.isEqual=function(t){return t instanceof ls&&os(this.internalValue,t.internalValue)},ls.NAN=new ls(NaN),ls.POSITIVE_INFINITY=new ls(1/0),ls.NEGATIVE_INFINITY=new ls(-1/0),ls);function ls(){return null!==cs&&cs.apply(this,arguments)||this}var fs,ps=(t(ds,fs=Ha),ds.prototype.value=function(t){return this.internalValue},ds.prototype.isEqual=function(t){return t instanceof ds&&this.internalValue===t.internalValue},ds.prototype.compareTo=function(t){return t instanceof ds?Si(this.internalValue,t.internalValue):this.defaultCompareTo(t)},ds);function ds(t){var e=fs.call(this)||this;return e.internalValue=t,e.typeOrder=Ba.StringValue,e}var ms,ys=(t(gs,ms=Ha),gs.prototype.value=function(t){return !t||t.timestampsInSnapshots?this.internalValue:this.internalValue.toDate()},gs.prototype.isEqual=function(t){return t instanceof gs&&this.internalValue.isEqual(t.internalValue)},gs.prototype.compareTo=function(t){return t instanceof gs?this.internalValue._compareTo(t.internalValue):t instanceof bs?-1:this.defaultCompareTo(t)},gs);function gs(t){var e=ms.call(this)||this;return e.internalValue=t,e.typeOrder=Ba.TimestampValue,e}var vs,bs=(t(ws,vs=Ha),ws.prototype.value=function(t){return t&&t.serverTimestampBehavior===Ka.Estimate?new ys(this.localWriteTime).value(t):t&&t.serverTimestampBehavior===Ka.Previous&&this.previousValue?this.previousValue.value(t):null},ws.prototype.isEqual=function(t){return t instanceof ws&&this.localWriteTime.isEqual(t.localWriteTime)},ws.prototype.compareTo=function(t){return t instanceof ws?this.localWriteTime._compareTo(t.localWriteTime):t instanceof ys?1:this.defaultCompareTo(t)},ws.prototype.toString=function(){return "<ServerTimestamp localTime="+this.localWriteTime.toString()+">"},ws);function ws(t,e){var n=vs.call(this)||this;return n.localWriteTime=t,n.previousValue=e,n.typeOrder=Ba.TimestampValue,n}var Ts,Ss=(t(Es,Ts=Ha),Es.prototype.value=function(t){return this.internalValue},Es.prototype.isEqual=function(t){return t instanceof Es&&this.internalValue.isEqual(t.internalValue)},Es.prototype.compareTo=function(t){return t instanceof Es?this.internalValue._compareTo(t.internalValue):this.defaultCompareTo(t)},Es);function Es(t){var e=Ts.call(this)||this;return e.internalValue=t,e.typeOrder=Ba.BlobValue,e}var Is,Cs=(t(Ds,Is=Ha),Ds.prototype.value=function(t){return this.key},Ds.prototype.isEqual=function(t){return t instanceof Ds&&this.key.isEqual(t.key)&&this.databaseId.isEqual(t.databaseId)},Ds.prototype.compareTo=function(t){if(t instanceof Ds){var e=this.databaseId.compareTo(t.databaseId);return 0!==e?e:Gi.comparator(this.key,t.key)}return this.defaultCompareTo(t)},Ds);function Ds(t,e){var n=Is.call(this)||this;return n.databaseId=t,n.key=e,n.typeOrder=Ba.RefValue,n}var Ns,As=(t(ks,Ns=Ha),ks.prototype.value=function(t){return this.internalValue},ks.prototype.isEqual=function(t){return t instanceof ks&&this.internalValue.isEqual(t.internalValue)},ks.prototype.compareTo=function(t){return t instanceof ks?this.internalValue._compareTo(t.internalValue):this.defaultCompareTo(t)},ks);function ks(t){var e=Ns.call(this)||this;return e.internalValue=t,e.typeOrder=Ba.GeoPointValue,e}var Rs,Ms=(t(_s,Rs=Ha),_s.prototype.value=function(n){var r={};return this.internalValue.inorderTraversal(function(t,e){r[t]=e.value(n);}),r},_s.prototype.forEach=function(t){this.internalValue.inorderTraversal(t);},_s.prototype.isEqual=function(t){if(t instanceof _s){for(var e=this.internalValue.getIterator(),n=t.internalValue.getIterator();e.hasNext()&&n.hasNext();){var r=e.getNext(),i=n.getNext();if(r.key!==i.key||!r.value.isEqual(i.value))return !1}return !e.hasNext()&&!n.hasNext()}return !1},_s.prototype.compareTo=function(t){if(t instanceof _s){for(var e=this.internalValue.getIterator(),n=t.internalValue.getIterator();e.hasNext()&&n.hasNext();){var r=e.getNext(),i=n.getNext(),o=Si(r.key,i.key)||r.value.compareTo(i.value);if(o)return o}return Si(e.hasNext(),n.hasNext())}return this.defaultCompareTo(t)},_s.prototype.set=function(t,e){if(Ur(!t.isEmpty(),"Cannot set field for empty path on ObjectValue"),1===t.length)return this.setChild(t.firstSegment(),e);var n=this.child(t.firstSegment());n instanceof _s||(n=_s.EMPTY);var r=n.set(t.popFirst(),e);return this.setChild(t.firstSegment(),r)},_s.prototype.delete=function(t){if(Ur(!t.isEmpty(),"Cannot delete field for empty path on ObjectValue"),1===t.length)return new _s(this.internalValue.remove(t.firstSegment()));var e=this.child(t.firstSegment());if(e instanceof _s){var n=e.delete(t.popFirst());return new _s(this.internalValue.insert(t.firstSegment(),n))}return this},_s.prototype.contains=function(t){return null!==this.field(t)},_s.prototype.field=function(t){Ur(!t.isEmpty(),"Can't get field of empty path");var e=this;return t.forEach(function(t){e=e instanceof _s?e.internalValue.get(t):null;}),e},_s.prototype.fieldMask=function(){var i=new So(Wi.comparator);return this.internalValue.forEach(function(t,e){var n=new Wi([t]);if(e instanceof _s){var r=e.fieldMask().fields;r.isEmpty()?i=i.add(n):r.forEach(function(t){i=i.add(n.child(t));});}else i=i.add(n);}),ba.fromSet(i)},_s.prototype.toString=function(){return this.internalValue.toString()},_s.prototype.child=function(t){return this.internalValue.get(t)||void 0},_s.prototype.setChild=function(t,e){return new _s(this.internalValue.insert(t,e))},_s.EMPTY=new _s(new po(Si)),_s);function _s(t){var e=Rs.call(this)||this;return e.internalValue=t,e.typeOrder=Ba.ObjectValue,e}var Ls,Os=(t(Ps,Ls=Ha),Ps.prototype.value=function(e){return this.internalValue.map(function(t){return t.value(e)})},Ps.prototype.contains=function(t){for(var e=0,n=this.internalValue;e<n.length;e++)if(n[e].isEqual(t))return !0;return !1},Ps.prototype.forEach=function(t){this.internalValue.forEach(t);},Ps.prototype.isEqual=function(t){if(t instanceof Ps){if(this.internalValue.length!==t.internalValue.length)return !1;for(var e=0;e<this.internalValue.length;e++)if(!this.internalValue[e].isEqual(t.internalValue[e]))return !1;return !0}return !1},Ps.prototype.compareTo=function(t){if(t instanceof Ps){for(var e=Math.min(this.internalValue.length,t.internalValue.length),n=0;n<e;n++){var r=this.internalValue[n].compareTo(t.internalValue[n]);if(r)return r}return Si(this.internalValue.length,t.internalValue.length)}return this.defaultCompareTo(t)},Ps.prototype.toString=function(){return "["+this.internalValue.map(function(t){return t.toString()}).join(",")+"]"},Ps);function Ps(t){var e=Ls.call(this)||this;return e.internalValue=t,e.typeOrder=Ba.ArrayValue,e}var xs=(Fs.compareByKey=function(t,e){return Gi.comparator(t.key,e.key)},Fs);function Fs(t,e){this.key=t,this.version=e;}var qs,Vs=(t(Bs,qs=xs),Bs.prototype.field=function(t){if(this.objectValue)return this.objectValue.field(t);this.fieldValueCache||(this.fieldValueCache=new Map);var e=t.canonicalString(),n=this.fieldValueCache.get(e);if(void 0===n){var r=this.getProtoField(t);n=void 0===r?null:this.converter(r),this.fieldValueCache.set(e,n);}return n},Bs.prototype.data=function(){var n=this;if(!this.objectValue){var r=Ms.EMPTY;$r(this.proto.fields||{},function(t,e){r=r.set(new Wi([t]),n.converter(e));}),this.objectValue=r,this.fieldValueCache=void 0;}return this.objectValue},Bs.prototype.value=function(){return this.data().value()},Bs.prototype.isEqual=function(t){return t instanceof Bs&&this.key.isEqual(t.key)&&this.version.isEqual(t.version)&&this.hasLocalMutations===t.hasLocalMutations&&this.hasCommittedMutations===t.hasCommittedMutations&&this.data().isEqual(t.data())},Bs.prototype.toString=function(){return "Document("+this.key+", "+this.version+", "+this.data().toString()+", {hasLocalMutations: "+this.hasLocalMutations+"}), {hasCommittedMutations: "+this.hasCommittedMutations+"})"},Object.defineProperty(Bs.prototype,"hasPendingWrites",{get:function(){return this.hasLocalMutations||this.hasCommittedMutations},enumerable:!0,configurable:!0}),Bs.prototype.getProtoField=function(t){Ur(void 0!==this.proto,"Can only call getProtoField() when proto is defined");for(var e=this.proto.fields?this.proto.fields[t.firstSegment()]:void 0,n=1;n<t.length;++n){if(!e||!e.mapValue||!e.mapValue.fields)return;e=e.mapValue.fields[t.get(n)];}return e},Bs.compareByField=function(t,e,n){var r=e.field(t),i=n.field(t);return null!==r&&null!==i?r.compareTo(i):Br("Trying to compare documents on fields that don't exist")},Bs);function Bs(t,e,n,r,i,o){var a=qs.call(this,t,e)||this;return a.objectValue=r,a.proto=i,a.converter=o,Ur(void 0!==a.objectValue||void 0!==a.proto&&void 0!==a.converter,"If objectValue is not defined, proto and converter need to be set."),a.hasLocalMutations=!!n.hasLocalMutations,a.hasCommittedMutations=!!n.hasCommittedMutations,a}var Us,Ks=(t(Qs,Us=xs),Qs.prototype.toString=function(){return "NoDocument("+this.key+", "+this.version+")"},Object.defineProperty(Qs.prototype,"hasPendingWrites",{get:function(){return this.hasCommittedMutations},enumerable:!0,configurable:!0}),Qs.prototype.isEqual=function(t){return t instanceof Qs&&t.hasCommittedMutations===this.hasCommittedMutations&&t.version.isEqual(this.version)&&t.key.isEqual(this.key)},Qs);function Qs(t,e,n){var r=Us.call(this,t,e)||this;return r.hasCommittedMutations=!(!n||!n.hasCommittedMutations),r}var Ws,js=(t(Gs,Ws=xs),Gs.prototype.toString=function(){return "UnknownDocument("+this.key+", "+this.version+")"},Object.defineProperty(Gs.prototype,"hasPendingWrites",{get:function(){return !0},enumerable:!0,configurable:!0}),Gs.prototype.isEqual=function(t){return t instanceof Gs&&t.version.isEqual(this.version)&&t.key.isEqual(this.key)},Gs);function Gs(){return null!==Ws&&Ws.apply(this,arguments)||this}var zs=(Hs.prototype.get=function(t){var e=this.mapKeyFn(t),n=this.inner[e];if(void 0!==n)for(var r=0,i=n;r<i.length;r++){var o=i[r],a=o[0],s=o[1];if(a.isEqual(t))return s}},Hs.prototype.has=function(t){return void 0!==this.get(t)},Hs.prototype.set=function(t,e){var n=this.mapKeyFn(t),r=this.inner[n];if(void 0!==r){for(var i=0;i<r.length;i++)if(r[i][0].isEqual(t))return void(r[i]=[t,e]);r.push([t,e]);}else this.inner[n]=[[t,e]];},Hs.prototype.delete=function(t){var e=this.mapKeyFn(t),n=this.inner[e];if(void 0===n)return !1;for(var r=0;r<n.length;r++)if(n[r][0].isEqual(t))return 1===n.length?delete this.inner[e]:n.splice(r,1),!0;return !1},Hs.prototype.forEach=function(s){$r(this.inner,function(t,e){for(var n=0,r=e;n<r.length;n++){var i=r[n],o=i[0],a=i[1];s(o,a);}});},Hs.prototype.isEmpty=function(){return ti(this.inner)},Hs);function Hs(t){this.mapKeyFn=t,this.inner={};}var Ys=(Object.defineProperty(Js.prototype,"readTime",{get:function(){return Ur(void 0!==this._readTime,"Read time is not set. All removeEntry() calls must include a readTime if `trackRemovals` is used."),this._readTime},set:function(t){Ur(void 0===this._readTime||this._readTime.isEqual(t),"All changes in a RemoteDocumentChangeBuffer must have the same read time"),this._readTime=t;},enumerable:!0,configurable:!0}),Js.prototype.addEntry=function(t,e){this.assertNotApplied(),this.readTime=e,this.changes.set(t.key,t);},Js.prototype.removeEntry=function(t,e){this.assertNotApplied(),e&&(this.readTime=e),this.changes.set(t,null);},Js.prototype.getEntry=function(t,e){this.assertNotApplied();var n=this.changes.get(e);return void 0!==n?Uo.resolve(n):this.getFromCache(t,e)},Js.prototype.getEntries=function(t,e){return this.getAllFromCache(t,e)},Js.prototype.apply=function(t){return this.assertNotApplied(),this.changesApplied=!0,this.applyChanges(t)},Js.prototype.assertNotApplied=function(){Ur(!this.changesApplied,"Changes have already been applied.");},Js);function Js(){this.changes=new zs(function(t){return t.toString()}),this.changesApplied=!1;}var Xs,Zs=($s.prototype.addEntry=function(t,e,n){return nu(t).put(ru(e),n)},$s.prototype.removeEntry=function(t,e){var n=nu(t),r=ru(e);return n.delete(r)},$s.prototype.updateMetadata=function(e,n){var r=this;return this.getMetadata(e).next(function(t){return t.byteSize+=n,r.setMetadata(e,t)})},$s.prototype.getEntry=function(t,e){var n=this;return nu(t).get(ru(e)).next(function(t){return n.maybeDecodeDocument(t)})},$s.prototype.getSizedEntry=function(t,e){var n=this;return nu(t).get(ru(e)).next(function(t){var e=n.maybeDecodeDocument(t);return e?{maybeDocument:e,size:iu(t)}:null})},$s.prototype.getEntries=function(t,e){var r=this,i=Ao();return this.forEachDbEntry(t,e,function(t,e){var n=r.maybeDecodeDocument(e);i=i.insert(t,n);}).next(function(){return i})},$s.prototype.getSizedEntries=function(t,e){var r=this,i=Ao(),o=new po(Gi.comparator);return this.forEachDbEntry(t,e,function(t,e){var n=r.maybeDecodeDocument(e);o=n?(i=i.insert(t,n),o.insert(t,iu(e))):(i=i.insert(t,null),o.insert(t,0));}).next(function(){return {maybeDocuments:i,sizeMap:o}})},$s.prototype.forEachDbEntry=function(t,e,i){if(e.isEmpty())return Uo.resolve();var n=IDBKeyRange.bound(e.first().path.toArray(),e.last().path.toArray()),o=e.getIterator(),a=o.getNext();return nu(t).iterate({range:n},function(t,e,n){for(var r=Gi.fromSegments(t);a&&Gi.comparator(a,r)<0;)i(a,null),a=o.getNext();a&&a.isEqual(r)&&(i(a,e),a=o.hasNext()?o.getNext():null),a?n.skip(a.path.toArray()):n.done();}).next(function(){for(;a;)i(a,null),a=o.hasNext()?o.getNext():null;})},$s.prototype.getDocumentsMatchingQuery=function(t,i,e){var o=this;Ur(!i.isCollectionGroupQuery(),"CollectionGroup queries should be handled in LocalDocumentsView");var a=Ro(),s=i.path.length+1,n={};if(e.isEqual(lo.MIN)){var r=i.path.toArray();n.range=IDBKeyRange.lowerBound(r);}else{var u=i.path.toArray(),c=this.serializer.toDbTimestampKey(e);n.range=IDBKeyRange.lowerBound([u,c],!0),n.index=Eu.collectionReadTimeIndex;}return nu(t).iterate(n,function(t,e,n){if(t.length===s){var r=o.serializer.fromDbRemoteDocument(e);i.path.isPrefixOf(r.key.path)?r instanceof Vs&&i.matches(r)&&(a=a.insert(r.key,r)):n.done();}}).next(function(){return a})},$s.prototype.getNewDocumentChanges=function(t,e){var r=this,i=No(),o=this.serializer.toDbTimestampKey(e),n=nu(t),a=IDBKeyRange.lowerBound(o,!0);return n.iterate({index:Eu.readTimeIndex,range:a},function(t,e){var n=r.serializer.fromDbRemoteDocument(e);i=i.insert(n.key,n),o=e.readTime;}).next(function(){return {changedDocs:i,readTime:r.serializer.fromDbTimestampKey(o)}})},$s.prototype.getLastDocumentChange=function(t){var r,i=this,e=nu(t),o=lo.MIN;return e.iterate({index:Eu.readTimeIndex,reverse:!0},function(t,e,n){r=i.serializer.fromDbRemoteDocument(e),e.readTime&&(o=i.serializer.fromDbTimestampKey(e.readTime)),n.done();}).next(function(){return {changedDoc:r,readTime:o}})},$s.prototype.newChangeBuffer=function(t){return new $s.RemoteDocumentChangeBuffer(this,!!t&&t.trackRemovals)},$s.prototype.getSize=function(t){return this.getMetadata(t).next(function(t){return t.byteSize})},$s.prototype.getMetadata=function(t){return eu(t).get(Cu.key).next(function(t){return Ur(!!t,"Missing document cache metadata"),t})},$s.prototype.setMetadata=function(t,e){return eu(t).put(Cu.key,e)},$s.prototype.maybeDecodeDocument=function(t){if(t){var e=this.serializer.fromDbRemoteDocument(t);return e instanceof Ks&&e.version.isEqual(lo.forDeletedDoc())?null:e}return null},$s.RemoteDocumentChangeBuffer=(t(tu,Xs=Ys),tu.prototype.applyChanges=function(a){var s=this,u=[],c=0,h=new So(function(t,e){return Si(t.canonicalString(),e.canonicalString())});return this.changes.forEach(function(t,e){var n=s.documentSizes.get(t);if(Ur(void 0!==n,"Cannot modify a document that wasn't read (for "+t+")"),e){Ur(!s.readTime.isEqual(lo.MIN),"Cannot add a document with a read time of zero");var r=s.documentCache.serializer.toDbRemoteDocument(e,s.readTime);h=h.add(t.path.popLast());var i=iu(r);c+=i-n,u.push(s.documentCache.addEntry(a,t,r));}else if(c-=n,s.trackRemovals){var o=s.documentCache.serializer.toDbRemoteDocument(new Ks(t,lo.forDeletedDoc()),s.readTime);u.push(s.documentCache.addEntry(a,t,o));}else u.push(s.documentCache.removeEntry(a,t));}),h.forEach(function(t){u.push(s.documentCache.indexManager.addToCollectionParentIndex(a,t));}),u.push(this.documentCache.updateMetadata(a,c)),Uo.waitFor(u)},tu.prototype.getFromCache=function(t,e){var n=this;return this.documentCache.getSizedEntry(t,e).next(function(t){return null===t?(n.documentSizes.set(e,0),null):(n.documentSizes.set(e,t.size),t.maybeDocument)})},tu.prototype.getAllFromCache=function(t,e){var n=this;return this.documentCache.getSizedEntries(t,e).next(function(t){var e=t.maybeDocuments;return t.sizeMap.forEach(function(t,e){n.documentSizes.set(t,e);}),e})},tu),$s);function $s(t,e){this.serializer=t,this.indexManager=e;}function tu(t,e){var n=Xs.call(this)||this;return n.documentCache=t,n.trackRemovals=e,n.documentSizes=new zs(function(t){return t.toString()}),n}function eu(t){return fc.getStore(t,Cu.store)}function nu(t){return fc.getStore(t,Eu.store)}function ru(t){return t.path.toArray()}function iu(t){var e;if(t.document)e=t.document;else if(t.unknownDocument)e=t.unknownDocument;else{if(!t.noDocument)throw Br("Unknown remote document type");e=t.noDocument;}return JSON.stringify(e).length}var ou=(au.prototype.addToCollectionParentIndex=function(t,e){return this.collectionParentIndex.add(e),Uo.resolve()},au.prototype.getCollectionParents=function(t,e){return Uo.resolve(this.collectionParentIndex.getEntries(e))},au);function au(){this.collectionParentIndex=new su;}var su=(uu.prototype.add=function(t){Ur(t.length%2==1,"Expected a collection path.");var e=t.lastSegment(),n=t.popLast(),r=this.index[e]||new So(Bi.comparator),i=!r.has(n);return this.index[e]=r.add(n),i},uu.prototype.has=function(t){var e=t.lastSegment(),n=t.popLast(),r=this.index[e];return r&&r.has(n)},uu.prototype.getEntries=function(t){return (this.index[t]||new So(Bi.comparator)).toArray()},uu);function uu(){this.index={};}var cu=9,hu=(lu.prototype.createOrUpgrade=function(t,e,n,r){var i=this;Ur(n<r&&0<=n&&r<=cu,"Unexpected schema upgrade from v"+n+" to v{toVersion}.");var o=new Ho(e);n<1&&1<=r&&(function(t){t.createObjectStore(pu.store);}(t),function(t){t.createObjectStore(mu.store,{keyPath:mu.keyPath}),t.createObjectStore(gu.store,{keyPath:gu.keyPath,autoIncrement:!0}).createIndex(gu.userMutationsIndex,gu.userMutationsKeyPath,{unique:!0}),t.createObjectStore(bu.store);}(t),Pu(t),function(t){t.createObjectStore(Eu.store);}(t));var a=Uo.resolve();return n<3&&3<=r&&(0!==n&&(function(t){t.deleteObjectStore(ku.store),t.deleteObjectStore(Nu.store),t.deleteObjectStore(Mu.store);}(t),Pu(t)),a=a.next(function(){return function(t){var e=t.store(Mu.store),n=new Mu(0,0,lo.MIN.toTimestamp(),0);return e.put(Mu.key,n)}(o)})),n<4&&4<=r&&(0!==n&&(a=a.next(function(){return function(r,i){return i.store(gu.store).loadAll().next(function(t){r.deleteObjectStore(gu.store),r.createObjectStore(gu.store,{keyPath:gu.keyPath,autoIncrement:!0}).createIndex(gu.userMutationsIndex,gu.userMutationsKeyPath,{unique:!0});var e=i.store(gu.store),n=t.map(function(t){return e.put(t)});return Uo.waitFor(n)})}(t,o)})),a=a.next(function(){!function(t){t.createObjectStore(xu.store,{keyPath:xu.keyPath});}(t);})),n<5&&5<=r&&(a=a.next(function(){return i.removeAcknowledgedMutations(o)})),n<6&&6<=r&&(a=a.next(function(){return function(t){t.createObjectStore(Cu.store);}(t),i.addDocumentGlobal(o)})),n<7&&7<=r&&(a=a.next(function(){return i.ensureSequenceNumbers(o)})),n<8&&8<=r&&(a=a.next(function(){return i.createCollectionParentIndex(t,o)})),n<9&&9<=r&&(a=a.next(function(){!function(t){t.objectStoreNames.contains("remoteDocumentChanges")&&t.deleteObjectStore("remoteDocumentChanges");}(t),function(t){var e=t.objectStore(Eu.store);e.createIndex(Eu.readTimeIndex,Eu.readTimeIndexPath,{unique:!1}),e.createIndex(Eu.collectionReadTimeIndex,Eu.collectionReadTimeIndexPath,{unique:!1});}(e);})),a},lu.prototype.addDocumentGlobal=function(e){var n=0;return e.store(Eu.store).iterate(function(t,e){n+=iu(e);}).next(function(){var t=new Cu(n);return e.store(Cu.store).put(Cu.key,t)})},lu.prototype.removeAcknowledgedMutations=function(r){var i=this,t=r.store(mu.store),e=r.store(gu.store);return t.loadAll().next(function(t){return Uo.forEach(t,function(n){var t=IDBKeyRange.bound([n.userId,-1],[n.userId,n.lastAcknowledgedBatchId]);return e.loadAll(gu.userMutationsIndex,t).next(function(t){return Uo.forEach(t,function(t){Ur(t.userId===n.userId,"Cannot process batch "+t.batchId+" from unexpected user");var e=i.serializer.fromDbMutationBatch(t);return ia(r,n.userId,e).next(function(){})})})})})},lu.prototype.ensureSequenceNumbers=function(t){var a=t.store(ku.store),e=t.store(Eu.store);return ga(t).next(function(i){var o=[];return e.iterate(function(t,e){var n=new Bi(t),r=function(t){return [0,oo(t)]}(n);o.push(a.get(r).next(function(t){return t?Uo.resolve():function(t){return a.put(new ku(0,oo(t),i))}(n)}));}).next(function(){return Uo.waitFor(o)})})},lu.prototype.createCollectionParentIndex=function(t,e){function i(t){if(o.add(t)){var e=t.lastSegment(),n=t.popLast();return r.put({collectionId:e,parent:oo(n)})}}t.createObjectStore(Lu.store,{keyPath:Lu.keyPath});var r=e.store(Lu.store),o=new su;return e.store(Eu.store).iterate({keysOnly:!0},function(t,e){var n=new Bi(t);return i(n.popLast())}).next(function(){return e.store(bu.store).iterate({keysOnly:!0},function(t,e){t[0];var n=t[1],r=(t[2],uo(n));return i(r.popLast())})})},lu);function lu(t){this.serializer=t;}var fu=function(t,e){this.seconds=t,this.nanoseconds=e;},pu=(du.store="owner",du.key="owner",du);function du(t,e,n){this.ownerId=t,this.allowTabSynchronization=e,this.leaseTimestampMs=n;}var mu=(yu.store="mutationQueues",yu.keyPath="userId",yu);function yu(t,e,n){this.userId=t,this.lastAcknowledgedBatchId=e,this.lastStreamToken=n;}var gu=(vu.store="mutations",vu.keyPath="batchId",vu.userMutationsIndex="userMutationsIndex",vu.userMutationsKeyPath=["userId","batchId"],vu);function vu(t,e,n,r,i){this.userId=t,this.batchId=e,this.localWriteTimeMs=n,this.baseMutations=r,this.mutations=i;}var bu=(wu.prefixForUser=function(t){return [t]},wu.prefixForPath=function(t,e){return [t,oo(e)]},wu.key=function(t,e,n){return [t,oo(e),n]},wu.store="documentMutations",wu.PLACEHOLDER=new wu,wu);function wu(){}var Tu=function(t,e){this.path=t,this.readTime=e;},Su=function(t,e){this.path=t,this.version=e;},Eu=(Iu.store="remoteDocuments",Iu.readTimeIndex="readTimeIndex",Iu.readTimeIndexPath="readTime",Iu.collectionReadTimeIndex="collectionReadTimeIndex",Iu.collectionReadTimeIndexPath=["parentPath","readTime"],Iu);function Iu(t,e,n,r,i,o){this.unknownDocument=t,this.noDocument=e,this.document=n,this.hasCommittedMutations=r,this.readTime=i,this.parentPath=o;}var Cu=(Du.store="remoteDocumentGlobal",Du.key="remoteDocumentGlobalKey",Du);function Du(t){this.byteSize=t;}var Nu=(Au.store="targets",Au.keyPath="targetId",Au.queryTargetsIndexName="queryTargetsIndex",Au.queryTargetsKeyPath=["canonicalId","targetId"],Au);function Au(t,e,n,r,i,o,a){this.targetId=t,this.canonicalId=e,this.readTime=n,this.resumeToken=r,this.lastListenSequenceNumber=i,this.lastLimboFreeSnapshotVersion=o,this.query=a;}var ku=(Ru.store="targetDocuments",Ru.keyPath=["targetId","path"],Ru.documentTargetsIndex="documentTargetsIndex",Ru.documentTargetsKeyPath=["path","targetId"],Ru);function Ru(t,e,n){this.targetId=t,this.path=e,Ur(0===t==(void 0!==(this.sequenceNumber=n)),"A target-document row must either have targetId == 0 and a defined sequence number, or a non-zero targetId and no sequence number");}var Mu=(_u.key="targetGlobalKey",_u.store="targetGlobal",_u);function _u(t,e,n,r){this.highestTargetId=t,this.highestListenSequenceNumber=e,this.lastRemoteSnapshotVersion=n,this.targetCount=r;}var Lu=(Ou.store="collectionParents",Ou.keyPath=["collectionId","parent"],Ou);function Ou(t,e){this.collectionId=t,this.parent=e;}function Pu(t){t.createObjectStore(ku.store,{keyPath:ku.keyPath}).createIndex(ku.documentTargetsIndex,ku.documentTargetsKeyPath,{unique:!0}),t.createObjectStore(Nu.store,{keyPath:Nu.keyPath}).createIndex(Nu.queryTargetsIndexName,Nu.queryTargetsKeyPath,{unique:!0}),t.createObjectStore(Mu.store);}var xu=(Fu.store="clientMetadata",Fu.keyPath="clientId",Fu);function Fu(t,e,n,r){this.clientId=t,this.updateTimeMs=e,this.networkEnabled=n,this.inForeground=r;}var qu,Vu,Bu=a(a(a([mu.store,gu.store,bu.store,Eu.store,Nu.store,pu.store,Mu.store,ku.store],[xu.store]),[Cu.store]),[Lu.store]),Uu=(Ku.prototype.addToCollectionParentIndex=function(t,e){var n=this;if(Ur(e.length%2==1,"Expected a collection path."),this.collectionParentsCache.has(e))return Uo.resolve();var r=e.lastSegment(),i=e.popLast();t.addOnCommittedListener(function(){n.collectionParentsCache.add(e);});var o={collectionId:r,parent:oo(i)};return Qu(t).put(o)},Ku.prototype.getCollectionParents=function(t,i){var o=[],e=IDBKeyRange.bound([i,""],[Ii(i),""],!1,!0);return Qu(t).loadAll(e).next(function(t){for(var e=0,n=t;e<n.length;e++){var r=n[e];if(r.collectionId!==i)break;o.push(uo(r.parent));}return o})},Ku);function Ku(){this.collectionParentsCache=new su;}function Qu(t){return fc.getStore(t,Lu.store)}(Vu=qu=qu||{})[Vu.Listen=0]="Listen",Vu[Vu.ExistenceFilterMismatch=1]="ExistenceFilterMismatch",Vu[Vu.LimboResolution=2]="LimboResolution";var Wu=(ju.prototype.withSequenceNumber=function(t){return new ju(this.target,this.targetId,this.purpose,t,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken)},ju.prototype.withResumeToken=function(t,e){return new ju(this.target,this.targetId,this.purpose,this.sequenceNumber,e,this.lastLimboFreeSnapshotVersion,t)},ju.prototype.withLastLimboFreeSnapshotVersion=function(t){return new ju(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,t,this.resumeToken)},ju.prototype.isEqual=function(t){return this.targetId===t.targetId&&this.purpose===t.purpose&&this.sequenceNumber===t.sequenceNumber&&this.snapshotVersion.isEqual(t.snapshotVersion)&&this.lastLimboFreeSnapshotVersion.isEqual(t.lastLimboFreeSnapshotVersion)&&this.resumeToken===t.resumeToken&&this.target.isEqual(t.target)},ju);function ju(t,e,n,r,i,o,a){void 0===i&&(i=lo.MIN),void 0===o&&(o=lo.MIN),void 0===a&&(a=Wr()),this.target=t,this.targetId=e,this.purpose=n,this.sequenceNumber=r,this.snapshotVersion=i,this.lastLimboFreeSnapshotVersion=o,this.resumeToken=a;}var Gu=(zu.prototype.fromDbRemoteDocument=function(t){if(t.document)return this.remoteSerializer.fromDocument(t.document,!!t.hasCommittedMutations);if(t.noDocument){var e=Gi.fromSegments(t.noDocument.path),n=this.fromDbTimestamp(t.noDocument.readTime);return new Ks(e,n,{hasCommittedMutations:!!t.hasCommittedMutations})}return t.unknownDocument?(e=Gi.fromSegments(t.unknownDocument.path),n=this.fromDbTimestamp(t.unknownDocument.version),new js(e,n)):Br("Unexpected DbRemoteDocument")},zu.prototype.toDbRemoteDocument=function(t,e){var n=this.toDbTimestampKey(e),r=t.key.path.popLast().toArray();if(t instanceof Vs){var i=t.proto?t.proto:this.remoteSerializer.toDocument(t),o=t.hasCommittedMutations;return new Eu(null,null,i,o,n,r)}if(t instanceof Ks){var a=t.key.path.toArray(),s=this.toDbTimestamp(t.version);return o=t.hasCommittedMutations,new Eu(null,new Tu(a,s),null,o,n,r)}if(t instanceof js){a=t.key.path.toArray();var u=this.toDbTimestamp(t.version);return new Eu(new Su(a,u),null,null,!0,n,r)}return Br("Unexpected MaybeDocument")},zu.prototype.toDbTimestampKey=function(t){var e=t.toTimestamp();return [e.seconds,e.nanoseconds]},zu.prototype.fromDbTimestampKey=function(t){var e=new co(t[0],t[1]);return lo.fromTimestamp(e)},zu.prototype.toDbTimestamp=function(t){var e=t.toTimestamp();return new fu(e.seconds,e.nanoseconds)},zu.prototype.fromDbTimestamp=function(t){var e=new co(t.seconds,t.nanoseconds);return lo.fromTimestamp(e)},zu.prototype.toDbMutationBatch=function(t,e){var n=this,r=e.baseMutations.map(function(t){return n.remoteSerializer.toMutation(t)}),i=e.mutations.map(function(t){return n.remoteSerializer.toMutation(t)});return new gu(t,e.batchId,e.localWriteTime.toMillis(),r,i)},zu.prototype.fromDbMutationBatch=function(t){var e=this,n=(t.baseMutations||[]).map(function(t){return e.remoteSerializer.fromMutation(t)}),r=t.mutations.map(function(t){return e.remoteSerializer.fromMutation(t)}),i=co.fromMillis(t.localWriteTimeMs);return new Fo(t.batchId,i,n,r)},zu.prototype.toDbResourcePaths=function(t){var e=[];return t.forEach(function(t){e.push(oo(t.path));}),e},zu.prototype.fromDbResourcePaths=function(t){for(var e=Oo(),n=0,r=t;n<r.length;n++){var i=r[n];e=e.add(new Gi(uo(i)));}return e},zu.prototype.fromDbTarget=function(t){var e,n=this.fromDbTimestamp(t.readTime),r=void 0!==t.lastLimboFreeSnapshotVersion?this.fromDbTimestamp(t.lastLimboFreeSnapshotVersion):lo.MIN,i=t.resumeToken;return e=function(t){return void 0!==t.documents}(t.query)?this.remoteSerializer.fromDocumentsTarget(t.query):this.remoteSerializer.fromQueryTarget(t.query),new Wu(e,t.targetId,qu.Listen,t.lastListenSequenceNumber,n,r,i)},zu.prototype.toDbTarget=function(t){Ur(qu.Listen===t.purpose,"Only queries with purpose "+qu.Listen+" may be stored, got "+t.purpose);var e,n,r=this.toDbTimestamp(t.snapshotVersion),i=this.toDbTimestamp(t.lastLimboFreeSnapshotVersion);return e=t.target.isDocumentQuery()?this.remoteSerializer.toDocumentsTarget(t.target):this.remoteSerializer.toQueryTarget(t.target),n=t.resumeToken instanceof Uint8Array?(Ur(Wo.isMockPersistence(),"Persisting non-string stream tokens is only supported with mock persistence ."),t.resumeToken.toString()):t.resumeToken,new Nu(t.targetId,t.target.canonicalId(),r,n,t.sequenceNumber,i,e)},zu);function zu(t){this.remoteSerializer=t;}function Hu(t,e){var n=t[0],r=t[1],i=e[0],o=e[1],a=Si(n,i);return 0===a?Si(r,o):a}var Yu=(Ju.prototype.nextIndex=function(){return ++this.previousIndex},Ju.prototype.addElement=function(t){var e=[t,this.nextIndex()];if(this.buffer.size<this.maxElements)this.buffer=this.buffer.add(e);else{var n=this.buffer.last();Hu(e,n)<0&&(this.buffer=this.buffer.delete(n).add(e));}},Object.defineProperty(Ju.prototype,"maxValue",{get:function(){return this.buffer.last()[0]},enumerable:!0,configurable:!0}),Ju);function Ju(t){this.maxElements=t,this.buffer=new So(Hu),this.previousIndex=0;}var Xu={didRun:!1,sequenceNumbersCollected:0,targetsRemoved:0,documentsRemoved:0},Zu=($u.withCacheSize=function(t){return new $u(t,$u.DEFAULT_COLLECTION_PERCENTILE,$u.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT)},$u.COLLECTION_DISABLED=-1,$u.MINIMUM_CACHE_SIZE_BYTES=1048576,$u.DEFAULT=new $u($u.DEFAULT_CACHE_SIZE_BYTES=41943040,$u.DEFAULT_COLLECTION_PERCENTILE=10,$u.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT=1e3),$u.DISABLED=new $u($u.COLLECTION_DISABLED,0,0),$u);function $u(t,e,n){this.cacheSizeCollectionThreshold=t,this.percentileToCollect=e,this.maximumSequenceNumbersToCollect=n;}var tc=(ec.prototype.start=function(){Ur(null===this.gcTask,"Cannot start an already started LruScheduler"),this.garbageCollector.params.cacheSizeCollectionThreshold!==Zu.COLLECTION_DISABLED&&this.scheduleGC();},ec.prototype.stop=function(){this.gcTask&&(this.gcTask.cancel(),this.gcTask=null);},Object.defineProperty(ec.prototype,"started",{get:function(){return null!==this.gcTask},enumerable:!0,configurable:!0}),ec.prototype.scheduleGC=function(){var t=this;Ur(null===this.gcTask,"Cannot schedule GC while a task is pending");var e=this.hasRun?3e5:6e4;Fr("LruGarbageCollector","Garbage collection scheduled in "+e+"ms"),this.gcTask=this.asyncQueue.enqueueAfterDelay(Hi.LruGarbageCollection,e,function(){return t.gcTask=null,t.hasRun=!0,t.localStore.collectGarbage(t.garbageCollector).then(function(){return t.scheduleGC()}).catch(dc)});},ec);function ec(t,e,n){this.garbageCollector=t,this.asyncQueue=e,this.localStore=n,this.hasRun=!1,this.gcTask=null;}var nc=(rc.prototype.calculateTargetCount=function(t,e){return this.delegate.getSequenceNumberCount(t).next(function(t){return Math.floor(e/100*t)})},rc.prototype.nthSequenceNumber=function(t,e){var n=this;if(0===e)return Uo.resolve(Oi.INVALID);var r=new Yu(e);return this.delegate.forEachTarget(t,function(t){return r.addElement(t.sequenceNumber)}).next(function(){return n.delegate.forEachOrphanedDocumentSequenceNumber(t,function(t){return r.addElement(t)})}).next(function(){return r.maxValue})},rc.prototype.removeTargets=function(t,e,n){return this.delegate.removeTargets(t,e,n)},rc.prototype.removeOrphanedDocuments=function(t,e){return this.delegate.removeOrphanedDocuments(t,e)},rc.prototype.collect=function(e,n){var r=this;return this.params.cacheSizeCollectionThreshold===Zu.COLLECTION_DISABLED?(Fr("LruGarbageCollector","Garbage collection skipped; disabled"),Uo.resolve(Xu)):this.getCacheSize(e).next(function(t){return t<r.params.cacheSizeCollectionThreshold?(Fr("LruGarbageCollector","Garbage collection skipped; Cache size "+t+" is lower than threshold "+r.params.cacheSizeCollectionThreshold),Xu):r.runGarbageCollection(e,n)})},rc.prototype.getCacheSize=function(t){return this.delegate.getCacheSize(t)},rc.prototype.runGarbageCollection=function(e,n){var r,i,o,a,s,u,c,h=this,l=Date.now();return this.calculateTargetCount(e,this.params.percentileToCollect).next(function(t){return i=t>h.params.maximumSequenceNumbersToCollect?(Fr("LruGarbageCollector","Capping sequence numbers to collect down to the maximum of "+h.params.maximumSequenceNumbersToCollect+" from "+t),h.params.maximumSequenceNumbersToCollect):t,a=Date.now(),h.nthSequenceNumber(e,i)}).next(function(t){return r=t,s=Date.now(),h.removeTargets(e,r,n)}).next(function(t){return o=t,u=Date.now(),h.removeOrphanedDocuments(e,r)}).next(function(t){return c=Date.now(),Pr()<=Cr.DEBUG&&Fr("LruGarbageCollector","LRU Garbage Collection\n\tCounted targets in "+(a-l)+"ms\n\tDetermined least recently used "+i+" in "+(s-a)+"ms\n\tRemoved "+o+" targets in "+(u-s)+"ms\n\tRemoved "+t+" documents in "+(c-u)+"ms\nTotal Duration: "+(c-l)+"ms"),Uo.resolve({didRun:!0,sequenceNumbersCollected:i,targetsRemoved:o,documentsRemoved:t})})},rc);function rc(t,e){this.delegate=t,this.params=e;}var ic=(oc.prototype.addOnCommittedListener=function(t){this.onCommittedListeners.push(t);},oc.prototype.raiseOnCommittedEvent=function(){this.onCommittedListeners.forEach(function(t){return t()});},oc);function oc(){this.onCommittedListeners=[];}var ac,sc="IndexedDbPersistence",uc="The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.",cc="Another tab has exclusive access to the persistence layer. To allow shared access, make sure to invoke `enablePersistence()` with `synchronizeTabs:true` in all tabs.",hc=(t(lc,ac=ic),lc);function lc(t,e){var n=ac.call(this)||this;return n.simpleDbTransaction=t,n.currentSequenceNumber=e,n}var fc=(pc.getStore=function(t,e){if(t instanceof hc)return Wo.getStore(t.simpleDbTransaction,e);throw Br("IndexedDbPersistence must use instances of IndexedDbTransaction")},pc.createIndexedDbPersistence=function(n){return p(this,void 0,void 0,function(){var e;return m(this,function(t){switch(t.label){case 0:if(!pc.isAvailable())throw new zr(Gr.UNIMPLEMENTED,"This platform is either missing IndexedDB or is known to have an incomplete implementation. Offline persistence has been disabled.");return [4,(e=new pc(n.allowTabSynchronization,n.persistenceKey,n.clientId,n.platform,n.lruParams,n.queue,n.serializer,n.sequenceNumberSyncer)).start()];case 1:return t.sent(),[2,e]}})})},pc.prototype.start=function(){var e=this;return Ur(!this.started,"IndexedDbPersistence double-started!"),Ur(null!==this.window,"Expected 'window' to be defined"),Wo.openOrCreate(this.dbName,cu,new hu(this.serializer)).then(function(t){return e.simpleDb=t,e.updateClientMetadataAndTryBecomePrimary()}).then(function(){return e.attachVisibilityHandler(),e.attachWindowUnloadHook(),e.scheduleClientMetadataAndPrimaryLeaseRefreshes(),e.simpleDb.runTransaction("readonly-idempotent",[Mu.store],function(t){return ga(t)})}).then(function(t){e.listenSequence=new Oi(t,e.sequenceNumberSyncer);}).then(function(){e._started=!0;}).catch(function(t){return e.simpleDb&&e.simpleDb.close(),Promise.reject(t)})},pc.prototype.setPrimaryStateListener=function(n){var t=this;return this.primaryStateListener=function(e){return p(t,void 0,void 0,function(){return m(this,function(t){return this.started?[2,n(e)]:[2]})})},n(this.isPrimary)},pc.prototype.setDatabaseDeletedListener=function(n){var t=this;this.simpleDb.setVersionChangeListener(function(e){return p(t,void 0,void 0,function(){return m(this,function(t){switch(t.label){case 0:return null!==e.newVersion?[3,2]:[4,n()];case 1:t.sent(),t.label=2;case 2:return [2]}})})});},pc.prototype.setNetworkEnabled=function(t){var e=this;this.networkEnabled!==t&&(this.networkEnabled=t,this.queue.enqueueAndForget(function(){return p(e,void 0,void 0,function(){return m(this,function(t){switch(t.label){case 0:return this.started?[4,this.updateClientMetadataAndTryBecomePrimary()]:[3,2];case 1:t.sent(),t.label=2;case 2:return [2]}})})}));},pc.prototype.updateClientMetadataAndTryBecomePrimary=function(){var n=this;return this.simpleDb.runTransaction("readwrite-idempotent",Bu,function(e){return yc(e).put(new xu(n.clientId,Date.now(),n.networkEnabled,n.inForeground)).next(function(){if(n.isPrimary)return n.verifyPrimaryLease(e).next(function(t){t||(n.isPrimary=!1,n.queue.enqueueAndForget(function(){return n.primaryStateListener(!1)}));})}).next(function(){return n.canActAsPrimary(e)}).next(function(t){return n.isPrimary&&!t?n.releasePrimaryLeaseIfHeld(e).next(function(){return !1}):!!t&&n.acquireOrExtendPrimaryLease(e).next(function(){return !0})})}).catch(function(t){if(!n.allowTabSynchronization)throw t;return Fr(sc,"Releasing owner lease after error during lease refresh",t),!1}).then(function(t){n.isPrimary!==t&&n.queue.enqueueAndForget(function(){return n.primaryStateListener(t)}),n.isPrimary=t;})},pc.prototype.verifyPrimaryLease=function(t){var e=this;return mc(t).get(pu.key).next(function(t){return Uo.resolve(e.isLocalClient(t))})},pc.prototype.removeClientMetadata=function(t){return yc(t).delete(this.clientId)},pc.prototype.maybeGarbageCollectMultiClientState=function(){return p(this,void 0,void 0,function(){var i=this;return m(this,function(t){switch(t.label){case 0:return !this.isPrimary||this.isWithinAge(this.lastGarbageCollectionTime,18e5)?[3,2]:(this.lastGarbageCollectionTime=Date.now(),[4,this.runTransaction("maybeGarbageCollectMultiClientState","readwrite-primary-idempotent",function(t){var r=pc.getStore(t,xu.store);return r.loadAll().next(function(t){var e=i.filterActiveClients(t,18e5),n=t.filter(function(t){return -1===e.indexOf(t)});return Uo.forEach(n,function(t){return r.delete(t.clientId)}).next(function(){return n})})})]);case 1:t.sent().forEach(function(t){i.window.localStorage.removeItem(i.zombiedClientLocalStorageKey(t.clientId));}),t.label=2;case 2:return [2]}})})},pc.prototype.scheduleClientMetadataAndPrimaryLeaseRefreshes=function(){var t=this;this.clientMetadataRefresher=this.queue.enqueueAfterDelay(Hi.ClientMetadataRefresh,4e3,function(){return t.updateClientMetadataAndTryBecomePrimary().then(function(){return t.maybeGarbageCollectMultiClientState()}).then(function(){return t.scheduleClientMetadataAndPrimaryLeaseRefreshes()})});},pc.prototype.isLocalClient=function(t){return !!t&&t.ownerId===this.clientId},pc.prototype.canActAsPrimary=function(e){var i=this;return mc(e).get(pu.key).next(function(t){if(null!==t&&i.isWithinAge(t.leaseTimestampMs,5e3)&&!i.isClientZombied(t.ownerId)){if(i.isLocalClient(t)&&i.networkEnabled)return !0;if(!i.isLocalClient(t)){if(!t.allowTabSynchronization)throw new zr(Gr.FAILED_PRECONDITION,cc);return !1}}return !(!i.networkEnabled||!i.inForeground)||yc(e).loadAll().next(function(t){return void 0===i.filterActiveClients(t,5e3).find(function(t){if(i.clientId!==t.clientId){var e=!i.networkEnabled&&t.networkEnabled,n=!i.inForeground&&t.inForeground,r=i.networkEnabled===t.networkEnabled;if(e||n&&r)return !0}return !1})})}).next(function(t){return i.isPrimary!==t&&Fr(sc,"Client "+(t?"is":"is not")+" eligible for a primary lease."),t})},pc.prototype.shutdown=function(){return p(this,void 0,void 0,function(){var e=this;return m(this,function(t){switch(t.label){case 0:return this._started=!1,this.markClientZombied(),this.clientMetadataRefresher&&(this.clientMetadataRefresher.cancel(),this.clientMetadataRefresher=null),this.detachVisibilityHandler(),this.detachWindowUnloadHook(),[4,this.simpleDb.runTransaction("readwrite-idempotent",[pu.store,xu.store],function(t){return e.releasePrimaryLeaseIfHeld(t).next(function(){return e.removeClientMetadata(t)})})];case 1:return t.sent(),this.simpleDb.close(),this.removeClientZombiedEntry(),[2]}})})},pc.prototype.filterActiveClients=function(t,e){var n=this;return t.filter(function(t){return n.isWithinAge(t.updateTimeMs,e)&&!n.isClientZombied(t.clientId)})},pc.prototype.getActiveClients=function(){var e=this;return this.simpleDb.runTransaction("readonly-idempotent",[xu.store],function(t){return yc(t).loadAll().next(function(t){return e.filterActiveClients(t,18e5).map(function(t){return t.clientId})})})},pc.clearPersistence=function(n){return p(this,void 0,void 0,function(){var e;return m(this,function(t){switch(t.label){case 0:return pc.isAvailable()?(e=n+pc.MAIN_DATABASE,[4,Wo.delete(e)]):[2,Promise.resolve()];case 1:return t.sent(),[2]}})})},Object.defineProperty(pc.prototype,"started",{get:function(){return this._started},enumerable:!0,configurable:!0}),pc.prototype.getMutationQueue=function(t){return Ur(this.started,"Cannot initialize MutationQueue before persistence is started."),ea.forUser(t,this.serializer,this.indexManager,this.referenceDelegate)},pc.prototype.getTargetCache=function(){return Ur(this.started,"Cannot initialize TargetCache before persistence is started."),this.targetCache},pc.prototype.getRemoteDocumentCache=function(){return Ur(this.started,"Cannot initialize RemoteDocumentCache before persistence is started."),this.remoteDocumentCache},pc.prototype.getIndexManager=function(){return Ur(this.started,"Cannot initialize IndexManager before persistence is started."),this.indexManager},pc.prototype.runTransaction=function(n,t,r){var i=this;Fr(sc,"Starting transaction:",n);var o,e=t.endsWith("idempotent"),a=t.startsWith("readonly")?e?"readonly-idempotent":"readonly":e?"readwrite-idempotent":"readwrite";return this.simpleDb.runTransaction(a,Bu,function(e){return o=new hc(e,i.listenSequence.next()),"readwrite-primary"===t||"readwrite-primary-idempotent"===t?i.verifyPrimaryLease(e).next(function(t){return !!t||i.canActAsPrimary(e)}).next(function(t){if(!t)throw qr("Failed to obtain primary lease for action '"+n+"'."),i.isPrimary=!1,i.queue.enqueueAndForget(function(){return i.primaryStateListener(!1)}),new zr(Gr.FAILED_PRECONDITION,uc);return r(o)}).next(function(t){return i.acquireOrExtendPrimaryLease(e).next(function(){return t})}):i.verifyAllowTabSynchronization(e).next(function(){return r(o)})}).then(function(t){return o.raiseOnCommittedEvent(),t})},pc.prototype.verifyAllowTabSynchronization=function(t){var e=this;return mc(t).get(pu.key).next(function(t){if(null!==t&&e.isWithinAge(t.leaseTimestampMs,5e3)&&!e.isClientZombied(t.ownerId)&&!e.isLocalClient(t)&&!t.allowTabSynchronization)throw new zr(Gr.FAILED_PRECONDITION,cc)})},pc.prototype.acquireOrExtendPrimaryLease=function(t){var e=new pu(this.clientId,this.allowTabSynchronization,Date.now());return mc(t).put(pu.key,e)},pc.isAvailable=function(){return Wo.isAvailable()},pc.buildStoragePrefix=function(t){var e=t.databaseId.projectId;return t.databaseId.isDefaultDatabase||(e+="."+t.databaseId.database),"firestore/"+t.persistenceKey+"/"+e+"/"},pc.prototype.releasePrimaryLeaseIfHeld=function(t){var e=this,n=mc(t);return n.get(pu.key).next(function(t){return e.isLocalClient(t)?(Fr(sc,"Releasing primary lease."),n.delete(pu.key)):Uo.resolve()})},pc.prototype.isWithinAge=function(t,e){var n=Date.now();return !(t<n-e||n<t&&(qr("Detected an update time that is in the future: "+t+" > "+n),1))},pc.prototype.attachVisibilityHandler=function(){var t=this;null!==this.document&&"function"==typeof this.document.addEventListener&&(this.documentVisibilityHandler=function(){t.queue.enqueueAndForget(function(){return t.inForeground="visible"===t.document.visibilityState,t.updateClientMetadataAndTryBecomePrimary()});},this.document.addEventListener("visibilitychange",this.documentVisibilityHandler),this.inForeground="visible"===this.document.visibilityState);},pc.prototype.detachVisibilityHandler=function(){this.documentVisibilityHandler&&(Ur(null!==this.document&&"function"==typeof this.document.addEventListener,"Expected 'document.addEventListener' to be a function"),this.document.removeEventListener("visibilitychange",this.documentVisibilityHandler),this.documentVisibilityHandler=null);},pc.prototype.attachWindowUnloadHook=function(){var t=this;"function"==typeof this.window.addEventListener&&(this.windowUnloadHandler=function(){t.markClientZombied(),t.queue.enqueueAndForget(function(){return t.shutdown()});},this.window.addEventListener("unload",this.windowUnloadHandler));},pc.prototype.detachWindowUnloadHook=function(){this.windowUnloadHandler&&(Ur("function"==typeof this.window.removeEventListener,"Expected 'window.removeEventListener' to be a function"),this.window.removeEventListener("unload",this.windowUnloadHandler),this.windowUnloadHandler=null);},pc.prototype.isClientZombied=function(t){try{var e=null!==this.webStorage.getItem(this.zombiedClientLocalStorageKey(t));return Fr(sc,"Client '"+t+"' "+(e?"is":"is not")+" zombied in LocalStorage"),e}catch(t){return qr(sc,"Failed to get zombied client id.",t),!1}},pc.prototype.markClientZombied=function(){try{this.webStorage.setItem(this.zombiedClientLocalStorageKey(this.clientId),String(Date.now()));}catch(t){qr("Failed to set zombie client id.",t);}},pc.prototype.removeClientZombiedEntry=function(){try{this.webStorage.removeItem(this.zombiedClientLocalStorageKey(this.clientId));}catch(t){}},pc.prototype.zombiedClientLocalStorageKey=function(t){return "firestore_zombie_"+this.persistenceKey+"_"+t},pc.MAIN_DATABASE="main",pc);function pc(t,e,n,r,i,o,a,s){if(this.allowTabSynchronization=t,this.persistenceKey=e,this.clientId=n,this.queue=o,this.sequenceNumberSyncer=s,this._started=!1,this.isPrimary=!1,this.networkEnabled=!0,this.windowUnloadHandler=null,this.inForeground=!1,this.documentVisibilityHandler=null,this.clientMetadataRefresher=null,this.lastGarbageCollectionTime=Number.NEGATIVE_INFINITY,this.primaryStateListener=function(t){return Promise.resolve()},this.referenceDelegate=new gc(this,i),this.dbName=e+pc.MAIN_DATABASE,this.serializer=new Gu(a),this.document=r.document,this.targetCache=new pa(this.referenceDelegate,this.serializer),this.indexManager=new Uu,this.remoteDocumentCache=new Zs(this.serializer,this.indexManager),!r.window||!r.window.localStorage)throw new zr(Gr.UNIMPLEMENTED,"IndexedDB persistence is only available on platforms that support LocalStorage.");this.window=r.window,this.webStorage=this.window.localStorage;}function dc(e){return p(this,void 0,void 0,function(){return m(this,function(t){if(!function(t){return t.code===Gr.FAILED_PRECONDITION&&t.message===uc}(e))throw e;return Fr(sc,"Unexpectedly lost primary lease"),[2]})})}function mc(t){return t.store(pu.store)}function yc(t){return t.store(xu.store)}var gc=(vc.prototype.getSequenceNumberCount=function(t){var n=this.orphanedDocmentCount(t);return this.db.getTargetCache().getTargetCount(t).next(function(e){return n.next(function(t){return e+t})})},vc.prototype.orphanedDocmentCount=function(t){var e=0;return this.forEachOrphanedDocumentSequenceNumber(t,function(t){e++;}).next(function(){return e})},vc.prototype.forEachTarget=function(t,e){return this.db.getTargetCache().forEachTarget(t,e)},vc.prototype.forEachOrphanedDocumentSequenceNumber=function(t,n){return this.forEachOrphanedDocument(t,function(t,e){return n(e)})},vc.prototype.setInMemoryPins=function(t){this.inMemoryPins=t;},vc.prototype.addReference=function(t,e){return bc(t,e)},vc.prototype.removeReference=function(t,e){return bc(t,e)},vc.prototype.removeTargets=function(t,e,n){return this.db.getTargetCache().removeTargets(t,e,n)},vc.prototype.removeMutationReference=function(t,e){return bc(t,e)},vc.prototype.isPinned=function(t,e){return this.inMemoryPins.containsKey(e)?Uo.resolve(!0):function(e,n){var r=!1;return ua(e).iterateSerial(function(t){return ra(e,t,n).next(function(t){return t&&(r=!0),Uo.resolve(!t)})}).next(function(){return r})}(t,e)},vc.prototype.removeOrphanedDocuments=function(r,i){var o=this,a=this.db.getRemoteDocumentCache().newChangeBuffer(),s=[],u=0;return this.forEachOrphanedDocument(r,function(e,t){if(t<=i){var n=o.isPinned(r,e).next(function(t){if(!t)return u++,a.getEntry(r,e).next(function(){return a.removeEntry(e),va(r).delete(function(t){return [0,oo(t.path)]}(e))})});s.push(n);}}).next(function(){return Uo.waitFor(s)}).next(function(){return a.apply(r)}).next(function(){return u})},vc.prototype.removeTarget=function(t,e){var n=e.withSequenceNumber(t.currentSequenceNumber);return this.db.getTargetCache().updateTargetData(t,n)},vc.prototype.updateLimboDocument=function(t,e){return bc(t,e)},vc.prototype.forEachOrphanedDocument=function(t,o){var a,e=va(t),s=Oi.INVALID;return e.iterate({index:ku.documentTargetsIndex},function(t,e){var n=t[0],r=(t[1],e.path),i=e.sequenceNumber;0===n?(s!==Oi.INVALID&&o(new Gi(uo(a)),s),s=i,a=r):s=Oi.INVALID;}).next(function(){s!==Oi.INVALID&&o(new Gi(uo(a)),s);})},vc.prototype.getCacheSize=function(t){return this.db.getRemoteDocumentCache().getSize(t)},vc);function vc(t,e){this.db=t,this.inMemoryPins=null,this.garbageCollector=new nc(this,e);}function bc(t,e){return va(t).put(function(t,e){return new ku(0,oo(t.path),e)}(e,t.currentSequenceNumber))}var wc=Number,Tc=wc.MIN_SAFE_INTEGER||-(Math.pow(2,53)-1),Sc=wc.MAX_SAFE_INTEGER||Math.pow(2,53)-1,Ec=wc.isInteger||function(t){return "number"==typeof t&&isFinite(t)&&Math.floor(t)===t};function Ic(t){return null==t}function Cc(t){return Ec(t)&&t<=Sc&&Tc<=t}var Dc,Nc,Ac=(kc.prototype.canonicalId=function(){if(null===this.memoizedCanonicalId){var t=this.path.canonicalString();null!==this.collectionGroup&&(t+="|cg:"+this.collectionGroup),t+="|f:";for(var e=0,n=this.filters;e<n.length;e++)t+=n[e].canonicalId(),t+=",";t+="|ob:";for(var r=0,i=this.orderBy;r<i.length;r++)t+=i[r].canonicalId(),t+=",";Ic(this.limit)||(t+="|l:",t+=this.limit),this.startAt&&(t+="|lb:",t+=this.startAt.canonicalId()),this.endAt&&(t+="|ub:",t+=this.endAt.canonicalId()),this.memoizedCanonicalId=t;}return this.memoizedCanonicalId},kc.prototype.toString=function(){var t=this.path.canonicalString();return null!==this.collectionGroup&&(t+=" collectionGroup="+this.collectionGroup),0<this.filters.length&&(t+=", filters: ["+this.filters.join(", ")+"]"),Ic(this.limit)||(t+=", limit: "+this.limit),0<this.orderBy.length&&(t+=", orderBy: ["+this.orderBy.join(", ")+"]"),this.startAt&&(t+=", startAt: "+this.startAt.canonicalId()),this.endAt&&(t+=", endAt: "+this.endAt.canonicalId()),"Target("+t+")"},kc.prototype.isEqual=function(t){if(this.limit!==t.limit)return !1;if(this.orderBy.length!==t.orderBy.length)return !1;for(var e=0;e<this.orderBy.length;e++)if(!this.orderBy[e].isEqual(t.orderBy[e]))return !1;if(this.filters.length!==t.filters.length)return !1;for(e=0;e<this.filters.length;e++)if(!this.filters[e].isEqual(t.filters[e]))return !1;return this.collectionGroup===t.collectionGroup&&!!this.path.isEqual(t.path)&&!(null!==this.startAt?!this.startAt.isEqual(t.startAt):null!==t.startAt)&&(null!==this.endAt?this.endAt.isEqual(t.endAt):null===t.endAt)},kc.prototype.isDocumentQuery=function(){return Gi.isDocumentKey(this.path)&&null===this.collectionGroup&&0===this.filters.length},kc);function kc(t,e,n,r,i,o,a){void 0===e&&(e=null),void 0===n&&(n=[]),void 0===r&&(r=[]),void 0===i&&(i=null),void 0===o&&(o=null),void 0===a&&(a=null),this.path=t,this.collectionGroup=e,this.orderBy=n,this.filters=r,this.limit=i,this.startAt=o,this.endAt=a,this.memoizedCanonicalId=null;}(Nc=Dc=Dc||{}).First="F",Nc.Last="L";var Rc=(Mc.atPath=function(t){return new Mc(t)},Object.defineProperty(Mc.prototype,"orderBy",{get:function(){if(null===this.memoizedOrderBy){var t=this.getInequalityFilterField(),e=this.getFirstOrderByField();if(null!==t&&null===e)t.isKeyField()?this.memoizedOrderBy=[oh]:this.memoizedOrderBy=[new rh(t),oh];else{Ur(null===t||null!==e&&t.isEqual(e),"First orderBy should match inequality field.");for(var n=!(this.memoizedOrderBy=[]),r=0,i=this.explicitOrderBy;r<i.length;r++){var o=i[r];this.memoizedOrderBy.push(o),o.field.isKeyField()&&(n=!0);}if(!n){var a=0<this.explicitOrderBy.length?this.explicitOrderBy[this.explicitOrderBy.length-1].dir:$c.ASCENDING;this.memoizedOrderBy.push(a===$c.ASCENDING?oh:ah);}}}return this.memoizedOrderBy},enumerable:!0,configurable:!0}),Mc.prototype.addFilter=function(t){Ur(null==this.getInequalityFilterField()||!(t instanceof xc)||!t.isInequality()||t.field.isEqual(this.getInequalityFilterField()),"Query must only have one inequality field."),Ur(!this.isDocumentQuery(),"No filtering allowed for document query");var e=this.filters.concat([t]);return new Mc(this.path,this.collectionGroup,this.explicitOrderBy.slice(),e,this.limit,this.limitType,this.startAt,this.endAt)},Mc.prototype.addOrderBy=function(t){Ur(!this.startAt&&!this.endAt,"Bounds must be set after orderBy");var e=this.explicitOrderBy.concat([t]);return new Mc(this.path,this.collectionGroup,e,this.filters.slice(),this.limit,this.limitType,this.startAt,this.endAt)},Mc.prototype.withLimitToFirst=function(t){return new Mc(this.path,this.collectionGroup,this.explicitOrderBy.slice(),this.filters.slice(),t,Dc.First,this.startAt,this.endAt)},Mc.prototype.withLimitToLast=function(t){return new Mc(this.path,this.collectionGroup,this.explicitOrderBy.slice(),this.filters.slice(),t,Dc.Last,this.startAt,this.endAt)},Mc.prototype.withStartAt=function(t){return new Mc(this.path,this.collectionGroup,this.explicitOrderBy.slice(),this.filters.slice(),this.limit,this.limitType,t,this.endAt)},Mc.prototype.withEndAt=function(t){return new Mc(this.path,this.collectionGroup,this.explicitOrderBy.slice(),this.filters.slice(),this.limit,this.limitType,this.startAt,t)},Mc.prototype.asCollectionQueryAtPath=function(t){return new Mc(t,null,this.explicitOrderBy.slice(),this.filters.slice(),this.limit,this.limitType,this.startAt,this.endAt)},Mc.prototype.matchesAllDocuments=function(){return 0===this.filters.length&&null===this.limit&&null==this.startAt&&null==this.endAt&&(0===this.explicitOrderBy.length||1===this.explicitOrderBy.length&&this.explicitOrderBy[0].field.isKeyField())},Mc.prototype.canonicalId=function(){return this.toTarget().canonicalId()+"|lt:"+this.limitType},Mc.prototype.toString=function(){return "Query(target="+this.toTarget().toString()+"; limitType="+this.limitType+")"},Mc.prototype.isEqual=function(t){return this.toTarget().isEqual(t.toTarget())&&this.limitType===t.limitType},Mc.prototype.docComparator=function(t,e){for(var n=!1,r=0,i=this.orderBy;r<i.length;r++){var o=i[r],a=o.compare(t,e);if(0!==a)return a;n=n||o.field.isKeyField();}return Ur(n,"orderBy used that doesn't compare on key field"),0},Mc.prototype.matches=function(t){return this.matchesPathAndCollectionGroup(t)&&this.matchesOrderBy(t)&&this.matchesFilters(t)&&this.matchesBounds(t)},Mc.prototype.hasLimitToFirst=function(){return !Ic(this.limit)&&this.limitType===Dc.First},Mc.prototype.hasLimitToLast=function(){return !Ic(this.limit)&&this.limitType===Dc.Last},Mc.prototype.getFirstOrderByField=function(){return 0<this.explicitOrderBy.length?this.explicitOrderBy[0].field:null},Mc.prototype.getInequalityFilterField=function(){for(var t=0,e=this.filters;t<e.length;t++){var n=e[t];if(n instanceof xc&&n.isInequality())return n.field}return null},Mc.prototype.findFilterOperator=function(t){for(var e=0,n=this.filters;e<n.length;e++){var r=n[e];if(r instanceof xc&&0<=t.indexOf(r.op))return r.op}return null},Mc.prototype.isDocumentQuery=function(){return this.toTarget().isDocumentQuery()},Mc.prototype.isCollectionGroupQuery=function(){return null!==this.collectionGroup},Mc.prototype.toTarget=function(){if(!this.memoizedTarget)if(this.limitType===Dc.First)this.memoizedTarget=new Ac(this.path,this.collectionGroup,this.orderBy,this.filters,this.limit,this.startAt,this.endAt);else{for(var t=[],e=0,n=this.orderBy;e<n.length;e++){var r=n[e],i=r.dir===$c.DESCENDING?$c.ASCENDING:$c.DESCENDING;t.push(new rh(r.field,i));}var o=this.endAt?new eh(this.endAt.position,!this.endAt.before):null,a=this.startAt?new eh(this.startAt.position,!this.startAt.before):null;this.memoizedTarget=new Ac(this.path,this.collectionGroup,t,this.filters,this.limit,o,a);}return this.memoizedTarget},Mc.prototype.matchesPathAndCollectionGroup=function(t){var e=t.key.path;return null!==this.collectionGroup?t.key.hasCollectionId(this.collectionGroup)&&this.path.isPrefixOf(e):Gi.isDocumentKey(this.path)?this.path.isEqual(e):this.path.isImmediateParentOf(e)},Mc.prototype.matchesOrderBy=function(t){for(var e=0,n=this.explicitOrderBy;e<n.length;e++){var r=n[e];if(!r.field.isKeyField()&&null===t.field(r.field))return !1}return !0},Mc.prototype.matchesFilters=function(t){for(var e=0,n=this.filters;e<n.length;e++)if(!n[e].matches(t))return !1;return !0},Mc.prototype.matchesBounds=function(t){return !(this.startAt&&!this.startAt.sortsBeforeDocument(this.orderBy,t)||this.endAt&&this.endAt.sortsBeforeDocument(this.orderBy,t))},Mc.prototype.assertValidBound=function(t){Ur(t.position.length<=this.orderBy.length,"Bound is longer than orderBy");},Mc);function Mc(t,e,n,r,i,o,a,s){void 0===e&&(e=null),void 0===n&&(n=[]),void 0===r&&(r=[]),void 0===i&&(i=null),void 0===o&&(o=Dc.First),void 0===a&&(a=null),void 0===s&&(s=null),this.path=t,this.collectionGroup=e,this.explicitOrderBy=n,this.filters=r,this.limit=i,this.limitType=o,this.startAt=a,this.endAt=s,this.memoizedOrderBy=null,this.memoizedTarget=null,this.startAt&&this.assertValidBound(this.startAt),this.endAt&&this.assertValidBound(this.endAt);}function _c(){}var Lc=(Oc.fromString=function(t){switch(t){case"<":return Oc.LESS_THAN;case"<=":return Oc.LESS_THAN_OR_EQUAL;case"==":return Oc.EQUAL;case">=":return Oc.GREATER_THAN_OR_EQUAL;case">":return Oc.GREATER_THAN;case"array-contains":return Oc.ARRAY_CONTAINS;case"in":return Oc.IN;case"array-contains-any":return Oc.ARRAY_CONTAINS_ANY;default:return Br("Unknown FieldFilter operator: "+t)}},Oc.prototype.toString=function(){return this.name},Oc.prototype.isEqual=function(t){return this.name===t.name},Oc.LESS_THAN=new Oc("<"),Oc.LESS_THAN_OR_EQUAL=new Oc("<="),Oc.EQUAL=new Oc("=="),Oc.GREATER_THAN=new Oc(">"),Oc.GREATER_THAN_OR_EQUAL=new Oc(">="),Oc.ARRAY_CONTAINS=new Oc("array-contains"),Oc.IN=new Oc("in"),Oc.ARRAY_CONTAINS_ANY=new Oc("array-contains-any"),Oc);function Oc(t){this.name=t;}var Pc,xc=(t(Fc,Pc=_c),Fc.create=function(t,e,n){if(t.isKeyField())return e===Lc.IN?(Ur(n instanceof Os,"Comparing on key with IN, but filter value not an ArrayValue"),Ur(n.internalValue.every(function(t){return t instanceof Cs}),"Comparing on key with IN, but an array value was not a RefValue"),new Kc(t,n)):(Ur(n instanceof Cs,"Comparing on key, but filter value not a RefValue"),Ur(e!==Lc.ARRAY_CONTAINS&&e!==Lc.ARRAY_CONTAINS_ANY,"'"+e.toString()+"' queries don't make sense on document keys."),new Vc(t,e,n));if(n.isEqual(Xa.INSTANCE)){if(e!==Lc.EQUAL)throw new zr(Gr.INVALID_ARGUMENT,"Invalid query. Null supports only equality comparisons.");return new Fc(t,e,n)}if(n.isEqual(hs.NAN)){if(e!==Lc.EQUAL)throw new zr(Gr.INVALID_ARGUMENT,"Invalid query. NaN supports only equality comparisons.");return new Fc(t,e,n)}return e===Lc.ARRAY_CONTAINS?new jc(t,n):e===Lc.IN?(Ur(n instanceof Os,"IN filter has invalid value: "+n.toString()),new Hc(t,n)):e===Lc.ARRAY_CONTAINS_ANY?(Ur(n instanceof Os,"ARRAY_CONTAINS_ANY filter has invalid value: "+n.toString()),new Xc(t,n)):new Fc(t,e,n)},Fc.prototype.matches=function(t){var e=t.field(this.field);return null!==e&&this.value.typeOrder===e.typeOrder&&this.matchesComparison(e.compareTo(this.value))},Fc.prototype.matchesComparison=function(t){switch(this.op){case Lc.LESS_THAN:return t<0;case Lc.LESS_THAN_OR_EQUAL:return t<=0;case Lc.EQUAL:return 0===t;case Lc.GREATER_THAN:return 0<t;case Lc.GREATER_THAN_OR_EQUAL:return 0<=t;default:return Br("Unknown FieldFilter operator: "+this.op)}},Fc.prototype.isInequality=function(){return 0<=[Lc.LESS_THAN,Lc.LESS_THAN_OR_EQUAL,Lc.GREATER_THAN,Lc.GREATER_THAN_OR_EQUAL].indexOf(this.op)},Fc.prototype.canonicalId=function(){return this.field.canonicalString()+this.op.toString()+this.value.toString()},Fc.prototype.isEqual=function(t){return t instanceof Fc&&this.op.isEqual(t.op)&&this.field.isEqual(t.field)&&this.value.isEqual(t.value)},Fc.prototype.toString=function(){return this.field.canonicalString()+" "+this.op+" "+this.value.value()},Fc);function Fc(t,e,n){var r=Pc.call(this)||this;return r.field=t,r.op=e,r.value=n,r}var qc,Vc=(t(Bc,qc=xc),Bc.prototype.matches=function(t){var e=this.value,n=Gi.comparator(t.key,e.key);return this.matchesComparison(n)},Bc);function Bc(){return null!==qc&&qc.apply(this,arguments)||this}var Uc,Kc=(t(Qc,Uc=xc),Qc.prototype.matches=function(e){return this.value.internalValue.some(function(t){return e.key.isEqual(t.key)})},Qc);function Qc(t,e){var n=Uc.call(this,t,Lc.IN,e)||this;return n.value=e,n}var Wc,jc=(t(Gc,Wc=xc),Gc.prototype.matches=function(t){var e=t.field(this.field);return e instanceof Os&&e.contains(this.value)},Gc);function Gc(t,e){return Wc.call(this,t,Lc.ARRAY_CONTAINS,e)||this}var zc,Hc=(t(Yc,zc=xc),Yc.prototype.matches=function(t){var e=this.value,n=t.field(this.field);return null!==n&&e.contains(n)},Yc);function Yc(t,e){var n=zc.call(this,t,Lc.IN,e)||this;return n.value=e,n}var Jc,Xc=(t(Zc,Jc=xc),Zc.prototype.matches=function(t){var e=this,n=t.field(this.field);return n instanceof Os&&n.internalValue.some(function(t){return e.value.contains(t)})},Zc);function Zc(t,e){var n=Jc.call(this,t,Lc.ARRAY_CONTAINS_ANY,e)||this;return n.value=e,n}var $c=(th.prototype.toString=function(){return this.name},th.ASCENDING=new th("asc"),th.DESCENDING=new th("desc"),th);function th(t){this.name=t;}var eh=(nh.prototype.canonicalId=function(){for(var t=this.before?"b:":"a:",e=0,n=this.position;e<n.length;e++)t+=n[e].toString();return t},nh.prototype.sortsBeforeDocument=function(t,e){Ur(this.position.length<=t.length,"Bound has more components than query's orderBy");for(var n=0,r=0;r<this.position.length;r++){var i=t[r],o=this.position[r];if(i.field.isKeyField())Ur(o instanceof Cs,"Bound has a non-key value where the key path is being used."),n=Gi.comparator(o.key,e.key);else{var a=e.field(i.field);Ur(null!==a,"Field should exist since document matched the orderBy already."),n=o.compareTo(a);}if(i.dir===$c.DESCENDING&&(n*=-1),0!==n)break}return this.before?n<=0:n<0},nh.prototype.isEqual=function(t){if(null===t)return !1;if(this.before!==t.before||this.position.length!==t.position.length)return !1;for(var e=0;e<this.position.length;e++){var n=this.position[e],r=t.position[e];if(!n.isEqual(r))return !1}return !0},nh);function nh(t,e){this.position=t,this.before=e;}var rh=(ih.prototype.compare=function(t,e){var n=this.isKeyOrderBy?Vs.compareByKey(t,e):Vs.compareByField(this.field,t,e);switch(this.dir){case $c.ASCENDING:return n;case $c.DESCENDING:return -1*n;default:return Br("Unknown direction: "+this.dir)}},ih.prototype.canonicalId=function(){return this.field.canonicalString()+this.dir.toString()},ih.prototype.toString=function(){return this.field.canonicalString()+" ("+this.dir+")"},ih.prototype.isEqual=function(t){return this.dir===t.dir&&this.field.isEqual(t.field)},ih);function ih(t,e){this.field=t,void 0===e&&(e=$c.ASCENDING),this.dir=e,this.isKeyOrderBy=t.isKeyField();}var oh=new rh(Wi.keyField(),$c.ASCENDING),ah=new rh(Wi.keyField(),$c.DESCENDING),sh=(uh.prototype.setLocalDocumentsView=function(t){this.localDocumentsView=t;},uh.prototype.getDocumentsMatchingQuery=function(e,r,i,o){var a=this;return Ur(void 0!==this.localDocumentsView,"setLocalDocumentsView() not called"),r.matchesAllDocuments()?this.executeFullCollectionScan(e,r):i.isEqual(lo.MIN)?this.executeFullCollectionScan(e,r):this.localDocumentsView.getDocuments(e,o).next(function(t){var n=a.applyQuery(r,t);return (r.hasLimitToFirst()||r.hasLimitToLast())&&a.needsRefill(r.limitType,n,o,i)?a.executeFullCollectionScan(e,r):(Pr()<=Cr.DEBUG&&Fr("IndexFreeQueryEngine","Re-using previous result from %s to execute query: %s",i.toString(),r.toString()),a.localDocumentsView.getDocumentsMatchingQuery(e,r,i).next(function(e){return n.forEach(function(t){e=e.insert(t.key,t);}),e}))})},uh.prototype.applyQuery=function(n,t){var r=new So(function(t,e){return n.docComparator(t,e)});return t.forEach(function(t,e){e instanceof Vs&&n.matches(e)&&(r=r.add(e));}),r},uh.prototype.needsRefill=function(t,e,n,r){if(n.size!==e.size)return !0;var i=t===Dc.First?e.last():e.first();return !!i&&(i.hasPendingWrites||0<i.version.compareTo(r))},uh.prototype.executeFullCollectionScan=function(t,e){return Pr()<=Cr.DEBUG&&Fr("IndexFreeQueryEngine","Using full collection scan to execute query: %s",e.toString()),this.localDocumentsView.getDocumentsMatchingQuery(t,e,lo.MIN)},uh);function uh(){}var ch=(hh.prototype.getDocument=function(e,n){var r=this;return this.mutationQueue.getAllMutationBatchesAffectingDocumentKey(e,n).next(function(t){return r.getDocumentInternal(e,n,t)})},hh.prototype.getDocumentInternal=function(t,r,i){return this.remoteDocumentCache.getEntry(t,r).next(function(t){for(var e=0,n=i;e<n.length;e++)t=n[e].applyToLocalView(r,t);return t})},hh.prototype.applyLocalMutationsToDocuments=function(t,e,i){var o=Ao();return e.forEach(function(t,e){for(var n=0,r=i;n<r.length;n++)e=r[n].applyToLocalView(t,e);o=o.insert(t,e);}),o},hh.prototype.getDocuments=function(e,t){var n=this;return this.remoteDocumentCache.getEntries(e,t).next(function(t){return n.getLocalViewOfDocuments(e,t)})},hh.prototype.getLocalViewOfDocuments=function(r,i){var o=this;return this.mutationQueue.getAllMutationBatchesAffectingDocumentKeys(r,i).next(function(t){var e=o.applyLocalMutationsToDocuments(r,i,t),n=No();return e.forEach(function(t,e){e=e||new Ks(t,lo.forDeletedDoc()),n=n.insert(t,e);}),n})},hh.prototype.getDocumentsMatchingQuery=function(t,e,n){return e.isDocumentQuery()?this.getDocumentsMatchingDocumentQuery(t,e.path):e.isCollectionGroupQuery()?this.getDocumentsMatchingCollectionGroupQuery(t,e,n):this.getDocumentsMatchingCollectionQuery(t,e,n)},hh.prototype.getDocumentsMatchingDocumentQuery=function(t,e){return this.getDocument(t,new Gi(e)).next(function(t){var e=Ro();return t instanceof Vs&&(e=e.insert(t.key,t)),e})},hh.prototype.getDocumentsMatchingCollectionGroupQuery=function(n,r,i){var o=this;Ur(r.path.isEmpty(),"Currently we only support collection group queries at the root.");var a=r.collectionGroup,s=Ro();return this.indexManager.getCollectionParents(n,a).next(function(t){return Uo.forEach(t,function(t){var e=r.asCollectionQueryAtPath(t.child(a));return o.getDocumentsMatchingCollectionQuery(n,e,i).next(function(t){t.forEach(function(t,e){s=s.insert(t,e);});})}).next(function(){return s})})},hh.prototype.getDocumentsMatchingCollectionQuery=function(e,n,t){var h,l,r=this;return this.remoteDocumentCache.getDocumentsMatchingQuery(e,n,t).next(function(t){return h=t,r.mutationQueue.getAllMutationBatchesAffectingQuery(e,n)}).next(function(t){return l=t,r.addMissingBaseDocuments(e,l,h).next(function(t){h=t;for(var e=0,n=l;e<n.length;e++)for(var r=n[e],i=0,o=r.mutations;i<o.length;i++){var a=o[i],s=a.key,u=h.get(s),c=a.applyToLocalView(u,u,r.localWriteTime);h=c instanceof Vs?h.insert(s,c):h.remove(s);}})}).next(function(){return h.forEach(function(t,e){n.matches(e)||(h=h.remove(t));}),h})},hh.prototype.addMissingBaseDocuments=function(t,e,n){for(var r=Oo(),i=0,o=e;i<o.length;i++)for(var a=0,s=o[i].mutations;a<s.length;a++){var u=s[a];u instanceof Oa&&null===n.get(u.key)&&(r=r.add(u.key));}var c=n;return this.remoteDocumentCache.getEntries(t,r).next(function(t){return t.forEach(function(t,e){null!==e&&e instanceof Vs&&(c=c.insert(t,e));}),c})},hh);function hh(t,e,n){this.remoteDocumentCache=t,this.mutationQueue=e,this.indexManager=n;}var lh=(fh.prototype.isEmpty=function(){return this.refsByKey.isEmpty()},fh.prototype.addReference=function(t,e){var n=new ph(t,e);this.refsByKey=this.refsByKey.add(n),this.refsByTarget=this.refsByTarget.add(n);},fh.prototype.addReferences=function(t,e){var n=this;t.forEach(function(t){return n.addReference(t,e)});},fh.prototype.removeReference=function(t,e){this.removeRef(new ph(t,e));},fh.prototype.removeReferences=function(t,e){var n=this;t.forEach(function(t){return n.removeReference(t,e)});},fh.prototype.removeReferencesForId=function(t){var e=this,n=Gi.EMPTY,r=new ph(n,t),i=new ph(n,t+1),o=[];return this.refsByTarget.forEachInRange([r,i],function(t){e.removeRef(t),o.push(t.key);}),o},fh.prototype.removeAllReferences=function(){var e=this;this.refsByKey.forEach(function(t){return e.removeRef(t)});},fh.prototype.removeRef=function(t){this.refsByKey=this.refsByKey.delete(t),this.refsByTarget=this.refsByTarget.delete(t);},fh.prototype.referencesForId=function(t){var e=Gi.EMPTY,n=new ph(e,t),r=new ph(e,t+1),i=Oo();return this.refsByTarget.forEachInRange([n,r],function(t){i=i.add(t.key);}),i},fh.prototype.containsKey=function(t){var e=new ph(t,0),n=this.refsByKey.firstAfterOrEqual(e);return null!==n&&t.isEqual(n.key)},fh);function fh(){this.refsByKey=new So(ph.compareByKey),this.refsByTarget=new So(ph.compareByTargetId);}var ph=(dh.compareByKey=function(t,e){return Gi.comparator(t.key,e.key)||Si(t.targetOrBatchId,e.targetOrBatchId)},dh.compareByTargetId=function(t,e){return Si(t.targetOrBatchId,e.targetOrBatchId)||Gi.comparator(t.key,e.key)},dh);function dh(t,e){this.key=t,this.targetOrBatchId=e;}var mh=(yh.prototype.start=function(){return this.synchronizeLastDocumentChangeReadTime()},yh.prototype.handleUserChange=function(i){return p(this,void 0,void 0,function(){var e,y,n,r=this;return m(this,function(t){switch(t.label){case 0:return e=this.mutationQueue,y=this.localDocuments,[4,this.persistence.runTransaction("Handle user change","readonly-idempotent",function(d){var m;return r.mutationQueue.getAllMutationBatches(d).next(function(t){return m=t,e=r.persistence.getMutationQueue(i),y=new ch(r.remoteDocuments,e,r.persistence.getIndexManager()),e.getAllMutationBatches(d)}).next(function(t){for(var e=[],n=[],r=Oo(),i=0,o=m;i<o.length;i++){var a=o[i];e.push(a.batchId);for(var s=0,u=a.mutations;s<u.length;s++){var c=u[s];r=r.add(c.key);}}for(var h=0,l=t;h<l.length;h++){a=l[h],n.push(a.batchId);for(var f=0,p=a.mutations;f<p.length;f++)c=p[f],r=r.add(c.key);}return y.getDocuments(d,r).next(function(t){return {affectedDocuments:t,removedBatchIds:e,addedBatchIds:n}})})})];case 1:return n=t.sent(),this.mutationQueue=e,this.localDocuments=y,this.queryEngine.setLocalDocumentsView(this.localDocuments),[2,n]}})})},yh.prototype.localWrite=function(s){var u,c=this,h=co.now(),t=s.reduce(function(t,e){return t.add(e.key)},Oo());return this.persistence.runTransaction("Locally write mutations","readwrite-idempotent",function(a){return c.localDocuments.getDocuments(a,t).next(function(t){u=t;for(var e=[],n=0,r=s;n<r.length;n++){var i=r[n],o=i.extractBaseValue(u.get(i.key));null!=o&&e.push(new Oa(i.key,o,o.fieldMask(),Da.exists(!0)));}return c.mutationQueue.addMutationBatch(a,h,e,s)})}).then(function(t){var e=t.applyToLocalDocumentSet(u);return {batchId:t.batchId,changes:e}})},yh.prototype.lookupMutationDocuments=function(t){var n=this;return this.persistence.runTransaction("Lookup mutation documents","readonly-idempotent",function(e){return n.mutationQueue.lookupMutationKeys(e,t).next(function(t){return t?n.localDocuments.getDocuments(e,t):Uo.resolve(null)})})},yh.prototype.acknowledgeBatch=function(r){var i=this;return this.persistence.runTransaction("Acknowledge batch","readwrite-primary-idempotent",function(t){var e=r.batch.keys(),n=i.remoteDocuments.newChangeBuffer({trackRemovals:!0});return i.mutationQueue.acknowledgeBatch(t,r.batch,r.streamToken).next(function(){return i.applyWriteToRemoteDocuments(t,r,n)}).next(function(){return n.apply(t)}).next(function(){return i.mutationQueue.performConsistencyCheck(t)}).next(function(){return i.localDocuments.getDocuments(t,e)})})},yh.prototype.rejectBatch=function(t){var r=this;return this.persistence.runTransaction("Reject batch","readwrite-primary-idempotent",function(e){var n;return r.mutationQueue.lookupMutationBatch(e,t).next(function(t){return Ur(null!==t,"Attempt to reject nonexistent batch!"),n=t.keys(),r.mutationQueue.removeMutationBatch(e,t)}).next(function(){return r.mutationQueue.performConsistencyCheck(e)}).next(function(){return r.localDocuments.getDocuments(e,n)})})},yh.prototype.getHighestUnacknowledgedBatchId=function(){var e=this;return this.persistence.runTransaction("Get highest unacknowledged batch id","readonly-idempotent",function(t){return e.mutationQueue.getHighestUnacknowledgedBatchId(t)})},yh.prototype.getLastStreamToken=function(){var e=this;return this.persistence.runTransaction("Get last stream token","readonly-idempotent",function(t){return e.mutationQueue.getLastStreamToken(t)})},yh.prototype.setLastStreamToken=function(e){var n=this;return this.persistence.runTransaction("Set last stream token","readwrite-primary-idempotent",function(t){return n.mutationQueue.setLastStreamToken(t,e)})},yh.prototype.getLastRemoteSnapshotVersion=function(){var e=this;return this.persistence.runTransaction("Get last remote snapshot version","readonly-idempotent",function(t){return e.targetCache.getLastRemoteSnapshotVersion(t)})},yh.prototype.applyRemoteEvent=function(u){var c=this,h=u.snapshotVersion,l=this.targetDataByTarget;return this.persistence.runTransaction("Apply remote event","readwrite-primary-idempotent",function(o){var i=c.remoteDocuments.newChangeBuffer({trackRemovals:!0});l=c.targetDataByTarget;var a=[];Zr(u.targetChanges,function(t,e){var n=l.get(t);if(n){a.push(c.targetCache.removeMatchingKeys(o,e.removedDocuments,t).next(function(){return c.targetCache.addMatchingKeys(o,e.addedDocuments,t)}));var r=e.resumeToken;if(0<r.length){var i=n.withResumeToken(r,h).withSequenceNumber(o.currentSequenceNumber);l=l.insert(t,i),yh.shouldPersistTargetData(n,i,e)&&a.push(c.targetCache.updateTargetData(o,i));}}});var s=No(),n=Oo();if(u.documentUpdates.forEach(function(t,e){n=n.add(t);}),a.push(i.getEntries(o,n).next(function(r){u.documentUpdates.forEach(function(t,e){var n=r.get(t);e instanceof Ks&&e.version.isEqual(lo.MIN)?(i.removeEntry(t,h),s=s.insert(t,e)):null==n||0<e.version.compareTo(n.version)||0===e.version.compareTo(n.version)&&n.hasPendingWrites?(Ur(!lo.MIN.isEqual(h),"Cannot add a document when the remote version is zero"),i.addEntry(e,h),s=s.insert(t,e)):Fr("LocalStore","Ignoring outdated watch update for ",t,". Current version:",n.version," Watch version:",e.version),u.resolvedLimboDocuments.has(t)&&a.push(c.persistence.referenceDelegate.updateLimboDocument(o,t));});})),!h.isEqual(lo.MIN)){var t=c.targetCache.getLastRemoteSnapshotVersion(o).next(function(t){return Ur(0<=h.compareTo(t),"Watch stream reverted to previous snapshot?? "+h+" < "+t),c.targetCache.setTargetsMetadata(o,o.currentSequenceNumber,h)});a.push(t);}return Uo.waitFor(a).next(function(){return i.apply(o)}).next(function(){return c.localDocuments.getLocalViewOfDocuments(o,s)})}).then(function(t){return c.targetDataByTarget=l,t})},yh.shouldPersistTargetData=function(t,e,n){return Ur(0<e.resumeToken.length,"Attempted to persist target data with no resume token"),0===t.resumeToken.length||e.snapshotVersion.toMicroseconds()-t.snapshotVersion.toMicroseconds()>=this.RESUME_TOKEN_MAX_AGE_MICROS||0<n.addedDocuments.size+n.modifiedDocuments.size+n.removedDocuments.size},yh.prototype.notifyLocalViewChanges=function(t){for(var n=this,e=0,r=t;e<r.length;e++){var i=r[e],o=i.targetId;if(this.localViewReferences.addReferences(i.addedKeys,o),this.localViewReferences.removeReferences(i.removedKeys,o),!i.fromCache){var a=this.targetDataByTarget.get(o);Ur(null!==a,"Can't set limbo-free snapshot version for unknown target: "+o);var s=a.snapshotVersion,u=a.withLastLimboFreeSnapshotVersion(s);this.targetDataByTarget=this.targetDataByTarget.insert(o,u);}}return this.persistence.runTransaction("notifyLocalViewChanges","readwrite-idempotent",function(e){return Uo.forEach(t,function(t){return Uo.forEach(t.removedKeys,function(t){return n.persistence.referenceDelegate.removeReference(e,t)})})})},yh.prototype.nextMutationBatch=function(e){var n=this;return this.persistence.runTransaction("Get next mutation batch","readonly-idempotent",function(t){return void 0===e&&(e=-1),n.mutationQueue.getNextMutationBatchAfterBatchId(t,e)})},yh.prototype.readDocument=function(e){var n=this;return this.persistence.runTransaction("read document","readonly-idempotent",function(t){return n.localDocuments.getDocument(t,e)})},yh.prototype.allocateTarget=function(r){var i=this;return this.persistence.runTransaction("Allocate target","readwrite-idempotent",function(e){var n;return i.targetCache.getTargetData(e,r).next(function(t){return t?(n=t,Uo.resolve(n)):i.targetCache.allocateTargetId(e).next(function(t){return n=new Wu(r,t,qu.Listen,e.currentSequenceNumber),i.targetCache.addTargetData(e,n).next(function(){return n})})})}).then(function(t){return null===i.targetDataByTarget.get(t.targetId)&&(i.targetDataByTarget=i.targetDataByTarget.insert(t.targetId,t),i.targetIdByTarget.set(r,t.targetId)),t})},yh.prototype.getTargetData=function(t,e){var n=this.targetIdByTarget.get(e);return void 0!==n?Uo.resolve(this.targetDataByTarget.get(n)):this.targetCache.getTargetData(t,e)},yh.prototype.releaseTarget=function(n,r){var i=this,o=this.targetDataByTarget.get(n);Ur(null!==o,"Tried to release nonexistent target: "+n);var t=r?"readwrite-idempotent":"readwrite-primary-idempotent";return this.persistence.runTransaction("Release target",t,function(e){var t=i.localViewReferences.removeReferencesForId(n);return r?Uo.resolve():Uo.forEach(t,function(t){return i.persistence.referenceDelegate.removeReference(e,t)}).next(function(){i.persistence.referenceDelegate.removeTarget(e,o);})}).then(function(){i.targetDataByTarget=i.targetDataByTarget.remove(n),i.targetIdByTarget.delete(o.target);})},yh.prototype.executeQuery=function(t,n){var r=this,i=lo.MIN,o=Oo();return this.persistence.runTransaction("Execute query","readonly-idempotent",function(e){return r.getTargetData(e,t.toTarget()).next(function(t){if(t)return i=t.lastLimboFreeSnapshotVersion,r.targetCache.getMatchingKeysForTargetId(e,t.targetId).next(function(t){o=t;})}).next(function(){return r.queryEngine.getDocumentsMatchingQuery(e,t,n?i:lo.MIN,n?o:Oo())}).next(function(t){return {documents:t,remoteKeys:o}})})},yh.prototype.remoteDocumentKeys=function(e){var n=this;return this.persistence.runTransaction("Remote document keys","readonly-idempotent",function(t){return n.targetCache.getMatchingKeysForTargetId(t,e)})},yh.prototype.getActiveClients=function(){return this.persistence.getActiveClients()},yh.prototype.removeCachedMutationBatchMetadata=function(t){this.mutationQueue.removeCachedMutationKeys(t);},yh.prototype.setNetworkEnabled=function(t){this.persistence.setNetworkEnabled(t);},yh.prototype.applyWriteToRemoteDocuments=function(t,i,o){var e=this,a=i.batch,n=a.keys(),s=Uo.resolve();return n.forEach(function(r){s=s.next(function(){return o.getEntry(t,r)}).next(function(t){var e=t,n=i.docVersions.get(r);Ur(null!==n,"ackVersions should contain every doc in the write."),(!e||e.version.compareTo(n)<0)&&((e=a.applyToRemoteDocument(r,e,i))?o.addEntry(e,i.commitVersion):Ur(!t,"Mutation batch "+a+" applied to document "+t+" resulted in null"));});}),s.next(function(){return e.mutationQueue.removeMutationBatch(t,a)})},yh.prototype.collectGarbage=function(e){var n=this;return this.persistence.runTransaction("Collect garbage","readwrite-primary-idempotent",function(t){return e.collect(t,n.targetDataByTarget)})},yh.prototype.getTarget=function(e){var n=this,t=this.targetDataByTarget.get(e);return t?Promise.resolve(t.target):this.persistence.runTransaction("Get target data","readonly-idempotent",function(t){return n.targetCache.getTargetDataForTarget(t,e).next(function(t){return t?t.target:null})})},yh.prototype.getNewDocumentChanges=function(){var r=this;return this.persistence.runTransaction("Get new document changes","readonly-idempotent",function(t){return r.remoteDocuments.getNewDocumentChanges(t,r.lastDocumentChangeReadTime)}).then(function(t){var e=t.changedDocs,n=t.readTime;return r.lastDocumentChangeReadTime=n,e})},yh.prototype.synchronizeLastDocumentChangeReadTime=function(){return p(this,void 0,void 0,function(){var e,n=this;return m(this,function(t){return this.remoteDocuments instanceof Zs?(e=this.remoteDocuments,[2,this.persistence.runTransaction("Synchronize last document change read time","readonly-idempotent",function(t){return e.getLastDocumentChange(t)}).then(function(t){var e=t.readTime;n.lastDocumentChangeReadTime=e;})]):[2]})})},yh.RESUME_TOKEN_MAX_AGE_MICROS=3e8,yh);function yh(t,e,n){this.persistence=t,this.queryEngine=e,this.localViewReferences=new lh,this.targetDataByTarget=new po(Si),this.targetIdByTarget=new zs(function(t){return t.canonicalId()}),this.lastDocumentChangeReadTime=lo.MIN,Ur(t.started,"LocalStore was passed an unstarted persistence implementation"),this.persistence.referenceDelegate.setInMemoryPins(this.localViewReferences),this.mutationQueue=t.getMutationQueue(n),this.remoteDocuments=t.getRemoteDocumentCache(),this.targetCache=t.getTargetCache(),this.localDocuments=new ch(this.remoteDocuments,this.mutationQueue,this.persistence.getIndexManager()),this.queryEngine.setLocalDocumentsView(this.localDocuments);}var gh=(vh.prototype.checkEmpty=function(t){return Uo.resolve(0===this.mutationQueue.length)},vh.prototype.acknowledgeBatch=function(t,e,n){var r=e.batchId,i=this.indexOfExistingBatchId(r,"acknowledged");Ur(0===i,"Can only acknowledge the first batch in the mutation queue");var o=this.mutationQueue[i];return Ur(r===o.batchId,"Queue ordering failure: expected batch "+r+", got batch "+o.batchId),this.lastStreamToken=n,Uo.resolve()},vh.prototype.getLastStreamToken=function(t){return Uo.resolve(this.lastStreamToken)},vh.prototype.setLastStreamToken=function(t,e){return this.lastStreamToken=e,Uo.resolve()},vh.prototype.addMutationBatch=function(t,e,n,r){Ur(0!==r.length,"Mutation batches should not be empty");var i=this.nextBatchId;this.nextBatchId++,0<this.mutationQueue.length&&Ur(this.mutationQueue[this.mutationQueue.length-1].batchId<i,"Mutation batchIDs must be monotonically increasing order");var o=new Fo(i,e,n,r);this.mutationQueue.push(o);for(var a=0,s=r;a<s.length;a++){var u=s[a];this.batchesByDocumentKey=this.batchesByDocumentKey.add(new ph(u.key,i)),this.indexManager.addToCollectionParentIndex(t,u.key.path.popLast());}return Uo.resolve(o)},vh.prototype.lookupMutationBatch=function(t,e){return Uo.resolve(this.findMutationBatch(e))},vh.prototype.lookupMutationKeys=function(t,e){var n=this.findMutationBatch(e);return Ur(null!=n,"Failed to find local mutation batch."),Uo.resolve(n.keys())},vh.prototype.getNextMutationBatchAfterBatchId=function(t,e){var n=e+1,r=this.indexOfBatchId(n),i=r<0?0:r;return Uo.resolve(this.mutationQueue.length>i?this.mutationQueue[i]:null)},vh.prototype.getHighestUnacknowledgedBatchId=function(){return Uo.resolve(0===this.mutationQueue.length?-1:this.nextBatchId-1)},vh.prototype.getAllMutationBatches=function(t){return Uo.resolve(this.mutationQueue.slice())},vh.prototype.getAllMutationBatchesAffectingDocumentKey=function(t,n){var r=this,e=new ph(n,0),i=new ph(n,Number.POSITIVE_INFINITY),o=[];return this.batchesByDocumentKey.forEachInRange([e,i],function(t){Ur(n.isEqual(t.key),"Should only iterate over a single key's batches");var e=r.findMutationBatch(t.targetOrBatchId);Ur(null!==e,"Batches in the index must exist in the main table"),o.push(e);}),Uo.resolve(o)},vh.prototype.getAllMutationBatchesAffectingDocumentKeys=function(t,e){var r=this,i=new So(Si);return e.forEach(function(e){var t=new ph(e,0),n=new ph(e,Number.POSITIVE_INFINITY);r.batchesByDocumentKey.forEachInRange([t,n],function(t){Ur(e.isEqual(t.key),"For each key, should only iterate over a single key's batches"),i=i.add(t.targetOrBatchId);});}),Uo.resolve(this.findMutationBatches(i))},vh.prototype.getAllMutationBatchesAffectingQuery=function(t,e){Ur(!e.isCollectionGroupQuery(),"CollectionGroup queries should be handled in LocalDocumentsView");var n=e.path,r=n.length+1,i=n;Gi.isDocumentKey(i)||(i=i.child(""));var o=new ph(new Gi(i),0),a=new So(Si);return this.batchesByDocumentKey.forEachWhile(function(t){var e=t.key.path;return !!n.isPrefixOf(e)&&(e.length===r&&(a=a.add(t.targetOrBatchId)),!0)},o),Uo.resolve(this.findMutationBatches(a))},vh.prototype.findMutationBatches=function(t){var n=this,r=[];return t.forEach(function(t){var e=n.findMutationBatch(t);null!==e&&r.push(e);}),r},vh.prototype.removeMutationBatch=function(n,r){var i=this;Ur(0===this.indexOfExistingBatchId(r.batchId,"removed"),"Can only remove the first entry of the mutation queue"),this.mutationQueue.shift();var o=this.batchesByDocumentKey;return Uo.forEach(r.mutations,function(t){var e=new ph(t.key,r.batchId);return o=o.delete(e),i.referenceDelegate.removeMutationReference(n,t.key)}).next(function(){i.batchesByDocumentKey=o;})},vh.prototype.removeCachedMutationKeys=function(t){},vh.prototype.containsKey=function(t,e){var n=new ph(e,0),r=this.batchesByDocumentKey.firstAfterOrEqual(n);return Uo.resolve(e.isEqual(r&&r.key))},vh.prototype.performConsistencyCheck=function(t){return 0===this.mutationQueue.length&&Ur(this.batchesByDocumentKey.isEmpty(),"Document leak -- detected dangling mutation references when queue is empty."),Uo.resolve()},vh.prototype.indexOfExistingBatchId=function(t,e){var n=this.indexOfBatchId(t);return Ur(0<=n&&n<this.mutationQueue.length,"Batches must exist to be "+e),n},vh.prototype.indexOfBatchId=function(t){return 0===this.mutationQueue.length?0:t-this.mutationQueue[0].batchId},vh.prototype.findMutationBatch=function(t){var e=this.indexOfBatchId(t);if(e<0||e>=this.mutationQueue.length)return null;var n=this.mutationQueue[e];return Ur(n.batchId===t,"If found batch must match"),n},vh);function vh(t,e){this.indexManager=t,this.referenceDelegate=e,this.mutationQueue=[],this.nextBatchId=1,this.lastStreamToken=Wr(),this.batchesByDocumentKey=new So(ph.compareByKey);}var bh,wh=(Th.prototype.addEntry=function(t,e,n){Ur(!n.isEqual(lo.MIN),"Cannot add a document with a read time of zero");var r=e.key,i=this.docs.get(r),o=i?i.size:0,a=this.sizer(e);return this.docs=this.docs.insert(r,{maybeDocument:e,size:a,readTime:n}),this.size+=a-o,this.indexManager.addToCollectionParentIndex(t,r.path.popLast())},Th.prototype.removeEntry=function(t){var e=this.docs.get(t);e&&(this.docs=this.docs.remove(t),this.size-=e.size);},Th.prototype.getEntry=function(t,e){var n=this.docs.get(e);return Uo.resolve(n?n.maybeDocument:null)},Th.prototype.getEntries=function(t,e){var n=this,r=Ao();return e.forEach(function(t){var e=n.docs.get(t);r=r.insert(t,e?e.maybeDocument:null);}),Uo.resolve(r)},Th.prototype.getDocumentsMatchingQuery=function(t,e,n){Ur(!e.isCollectionGroupQuery(),"CollectionGroup queries should be handled in LocalDocumentsView");for(var r=Ro(),i=new Gi(e.path.child("")),o=this.docs.getIteratorFrom(i);o.hasNext();){var a=o.getNext(),s=a.key,u=a.value,c=u.maybeDocument,h=u.readTime;if(!e.path.isPrefixOf(s.path))break;h.compareTo(n)<=0||c instanceof Vs&&e.matches(c)&&(r=r.insert(c.key,c));}return Uo.resolve(r)},Th.prototype.forEachDocumentKey=function(t,e){return Uo.forEach(this.docs,function(t){return e(t)})},Th.prototype.getNewDocumentChanges=function(t,e){throw new Error("getNewDocumentChanges() is not supported with MemoryPersistence")},Th.prototype.newChangeBuffer=function(t){return new Th.RemoteDocumentChangeBuffer(this)},Th.prototype.getSize=function(t){return Uo.resolve(this.size)},Th.RemoteDocumentChangeBuffer=(t(Sh,bh=Ys),Sh.prototype.applyChanges=function(n){var r=this,i=[];return this.changes.forEach(function(t,e){e?i.push(r.documentCache.addEntry(n,e,r.readTime)):r.documentCache.removeEntry(t);}),Uo.waitFor(i)},Sh.prototype.getFromCache=function(t,e){return this.documentCache.getEntry(t,e)},Sh.prototype.getAllFromCache=function(t,e){return this.documentCache.getEntries(t,e)},Sh),Th);function Th(t,e){this.indexManager=t,this.sizer=e,this.docs=new po(Gi.comparator),this.size=0;}function Sh(t){var e=bh.call(this)||this;return e.documentCache=t,e}var Eh=(Ih.prototype.forEachTarget=function(t,n){return this.targets.forEach(function(t,e){return n(e)}),Uo.resolve()},Ih.prototype.getLastRemoteSnapshotVersion=function(t){return Uo.resolve(this.lastRemoteSnapshotVersion)},Ih.prototype.getHighestSequenceNumber=function(t){return Uo.resolve(this.highestSequenceNumber)},Ih.prototype.allocateTargetId=function(t){var e=this.targetIdGenerator.after(this.highestTargetId);return this.highestTargetId=e,Uo.resolve(e)},Ih.prototype.setTargetsMetadata=function(t,e,n){return n&&(this.lastRemoteSnapshotVersion=n),e>this.highestSequenceNumber&&(this.highestSequenceNumber=e),Uo.resolve()},Ih.prototype.saveTargetData=function(t){this.targets.set(t.target,t);var e=t.targetId;e>this.highestTargetId&&(this.highestTargetId=e),t.sequenceNumber>this.highestSequenceNumber&&(this.highestSequenceNumber=t.sequenceNumber);},Ih.prototype.addTargetData=function(t,e){return Ur(!this.targets.has(e.target),"Adding a target that already exists"),this.saveTargetData(e),this.targetCount+=1,Uo.resolve()},Ih.prototype.updateTargetData=function(t,e){return Ur(this.targets.has(e.target),"Updating a non-existent target"),this.saveTargetData(e),Uo.resolve()},Ih.prototype.removeTargetData=function(t,e){return Ur(0<this.targetCount,"Removing a target from an empty cache"),Ur(this.targets.has(e.target),"Removing a non-existent target from the cache"),this.targets.delete(e.target),this.references.removeReferencesForId(e.targetId),this.targetCount-=1,Uo.resolve()},Ih.prototype.removeTargets=function(n,r,i){var o=this,a=0,s=[];return this.targets.forEach(function(t,e){e.sequenceNumber<=r&&null===i.get(e.targetId)&&(o.targets.delete(t),s.push(o.removeMatchingKeysForTargetId(n,e.targetId)),a++);}),Uo.waitFor(s).next(function(){return a})},Ih.prototype.getTargetCount=function(t){return Uo.resolve(this.targetCount)},Ih.prototype.getTargetData=function(t,e){var n=this.targets.get(e)||null;return Uo.resolve(n)},Ih.prototype.getTargetDataForTarget=function(t,e){return Br("Not yet implemented.")},Ih.prototype.addMatchingKeys=function(e,t,n){this.references.addReferences(t,n);var r=this.persistence.referenceDelegate,i=[];return r&&t.forEach(function(t){i.push(r.addReference(e,t));}),Uo.waitFor(i)},Ih.prototype.removeMatchingKeys=function(e,t,n){this.references.removeReferences(t,n);var r=this.persistence.referenceDelegate,i=[];return r&&t.forEach(function(t){i.push(r.removeReference(e,t));}),Uo.waitFor(i)},Ih.prototype.removeMatchingKeysForTargetId=function(t,e){return this.references.removeReferencesForId(e),Uo.resolve()},Ih.prototype.getMatchingKeysForTargetId=function(t,e){var n=this.references.referencesForId(e);return Uo.resolve(n)},Ih.prototype.containsKey=function(t,e){return Uo.resolve(this.references.containsKey(e))},Ih);function Ih(t){this.persistence=t,this.targets=new zs(function(t){return t.canonicalId()}),this.lastRemoteSnapshotVersion=lo.MIN,this.highestTargetId=0,this.highestSequenceNumber=0,this.references=new lh,this.targetCount=0,this.targetIdGenerator=la.forTargetCache();}var Ch=(Dh.createLruPersistence=function(t,e,n){return new Dh(t,function(t){return new _h(t,new Gu(e),n)})},Dh.createEagerPersistence=function(t){return new Dh(t,function(t){return new Rh(t)})},Dh.prototype.shutdown=function(){return this._started=!1,Promise.resolve()},Object.defineProperty(Dh.prototype,"started",{get:function(){return this._started},enumerable:!0,configurable:!0}),Dh.prototype.getActiveClients=function(){return p(this,void 0,void 0,function(){return m(this,function(t){return [2,[this.clientId]]})})},Dh.prototype.setPrimaryStateListener=function(t){return t(!0)},Dh.prototype.setDatabaseDeletedListener=function(){},Dh.prototype.setNetworkEnabled=function(t){},Dh.prototype.getIndexManager=function(){return this.indexManager},Dh.prototype.getMutationQueue=function(t){var e=this.mutationQueues[t.toKey()];return e||(e=new gh(this.indexManager,this.referenceDelegate),this.mutationQueues[t.toKey()]=e),e},Dh.prototype.getTargetCache=function(){return this.targetCache},Dh.prototype.getRemoteDocumentCache=function(){return this.remoteDocumentCache},Dh.prototype.runTransaction=function(t,e,n){var r=this;Fr("MemoryPersistence","Starting transaction:",t);var i=new Ah(this.listenSequence.next());return this.referenceDelegate.onTransactionStarted(),n(i).next(function(t){return r.referenceDelegate.onTransactionCommitted(i).next(function(){return t})}).toPromise().then(function(t){return i.raiseOnCommittedEvent(),t})},Dh.prototype.mutationQueuesContainKey=function(e,n){return Uo.or(function(t){var n=[];return $r(t,function(t,e){return n.push(e)}),n}(this.mutationQueues).map(function(t){return function(){return t.containsKey(e,n)}}))},Dh);function Dh(t,e){var n=this;this.clientId=t,this.mutationQueues={},this.listenSequence=new Oi(0),this._started=!1,this._started=!0,this.referenceDelegate=e(this),this.targetCache=new Eh(this);this.indexManager=new ou,this.remoteDocumentCache=new wh(this.indexManager,function(t){return n.referenceDelegate.documentSize(t)});}var Nh,Ah=(t(kh,Nh=ic),kh);function kh(t){var e=Nh.call(this)||this;return e.currentSequenceNumber=t,e}var Rh=(Object.defineProperty(Mh.prototype,"orphanedDocuments",{get:function(){if(this._orphanedDocuments)return this._orphanedDocuments;throw Br("orphanedDocuments is only valid during a transaction.")},enumerable:!0,configurable:!0}),Mh.prototype.setInMemoryPins=function(t){this.inMemoryPins=t;},Mh.prototype.addReference=function(t,e){return this.orphanedDocuments.delete(e),Uo.resolve()},Mh.prototype.removeReference=function(t,e){return this.orphanedDocuments.add(e),Uo.resolve()},Mh.prototype.removeMutationReference=function(t,e){return this.orphanedDocuments.add(e),Uo.resolve()},Mh.prototype.removeTarget=function(t,e){var n=this,r=this.persistence.getTargetCache();return r.getMatchingKeysForTargetId(t,e.targetId).next(function(t){t.forEach(function(t){return n.orphanedDocuments.add(t)});}).next(function(){return r.removeTargetData(t,e)})},Mh.prototype.onTransactionStarted=function(){this._orphanedDocuments=new Set;},Mh.prototype.onTransactionCommitted=function(t){var n=this,r=this.persistence.getRemoteDocumentCache().newChangeBuffer();return Uo.forEach(this.orphanedDocuments,function(e){return n.isReferenced(t,e).next(function(t){t||r.removeEntry(e);})}).next(function(){return n._orphanedDocuments=null,r.apply(t)})},Mh.prototype.updateLimboDocument=function(t,e){var n=this;return this.isReferenced(t,e).next(function(t){t?n.orphanedDocuments.delete(e):n.orphanedDocuments.add(e);})},Mh.prototype.documentSize=function(t){return 0},Mh.prototype.isReferenced=function(t,e){var n=this;return Uo.or([function(){return n.persistence.getTargetCache().containsKey(t,e)},function(){return n.persistence.mutationQueuesContainKey(t,e)},function(){return Uo.resolve(n.inMemoryPins.containsKey(e))}])},Mh);function Mh(t){this.persistence=t,this.inMemoryPins=null,this._orphanedDocuments=null;}var _h=(Lh.prototype.onTransactionStarted=function(){},Lh.prototype.onTransactionCommitted=function(t){return Uo.resolve()},Lh.prototype.forEachTarget=function(t,e){return this.persistence.getTargetCache().forEachTarget(t,e)},Lh.prototype.getSequenceNumberCount=function(t){var n=this.orphanedDocumentCount(t);return this.persistence.getTargetCache().getTargetCount(t).next(function(e){return n.next(function(t){return e+t})})},Lh.prototype.orphanedDocumentCount=function(t){var e=0;return this.forEachOrphanedDocumentSequenceNumber(t,function(t){e++;}).next(function(){return e})},Lh.prototype.forEachOrphanedDocumentSequenceNumber=function(n,r){var i=this;return Uo.forEach(this.orphanedSequenceNumbers,function(t,e){return i.isPinned(n,t,e).next(function(t){return t?Uo.resolve():r(e)})})},Lh.prototype.setInMemoryPins=function(t){this.inMemoryPins=t;},Lh.prototype.removeTargets=function(t,e,n){return this.persistence.getTargetCache().removeTargets(t,e,n)},Lh.prototype.removeOrphanedDocuments=function(t,n){var r=this,i=0,e=this.persistence.getRemoteDocumentCache(),o=e.newChangeBuffer();return e.forEachDocumentKey(t,function(e){return r.isPinned(t,e,n).next(function(t){t||(i++,o.removeEntry(e));})}).next(function(){return o.apply(t)}).next(function(){return i})},Lh.prototype.removeMutationReference=function(t,e){return this.orphanedSequenceNumbers.set(e,t.currentSequenceNumber),Uo.resolve()},Lh.prototype.removeTarget=function(t,e){var n=e.withSequenceNumber(t.currentSequenceNumber);return this.persistence.getTargetCache().updateTargetData(t,n)},Lh.prototype.addReference=function(t,e){return this.orphanedSequenceNumbers.set(e,t.currentSequenceNumber),Uo.resolve()},Lh.prototype.removeReference=function(t,e){return this.orphanedSequenceNumbers.set(e,t.currentSequenceNumber),Uo.resolve()},Lh.prototype.updateLimboDocument=function(t,e){return this.orphanedSequenceNumbers.set(e,t.currentSequenceNumber),Uo.resolve()},Lh.prototype.documentSize=function(t){var e,n=this.serializer.toDbRemoteDocument(t,t.version);if(n.document)e=n.document;else if(n.unknownDocument)e=n.unknownDocument;else{if(!n.noDocument)throw Br("Unknown remote document type");e=n.noDocument;}return JSON.stringify(e).length},Lh.prototype.isPinned=function(t,e,n){var r=this;return Uo.or([function(){return r.persistence.mutationQueuesContainKey(t,e)},function(){return Uo.resolve(r.inMemoryPins.containsKey(e))},function(){return r.persistence.getTargetCache().containsKey(t,e)},function(){var t=r.orphanedSequenceNumbers.get(e);return Uo.resolve(void 0!==t&&n<t)}])},Lh.prototype.getCacheSize=function(t){return this.persistence.getRemoteDocumentCache().getSize(t)},Lh);function Lh(t,e,n){this.persistence=t,this.serializer=e,this.inMemoryPins=null,this.orphanedSequenceNumbers=new zs(function(t){return oo(t.path)}),this.garbageCollector=new nc(this,n);}var Oh=(Ph.prototype.reset=function(){this.currentBaseMs=0;},Ph.prototype.resetToMax=function(){this.currentBaseMs=this.maxDelayMs;},Ph.prototype.backoffAndRun=function(t){var e=this;this.cancel();var n=Math.floor(this.currentBaseMs+this.jitterDelayMs()),r=Math.max(0,Date.now()-this.lastAttemptTime),i=Math.max(0,n-r);0<this.currentBaseMs&&Fr("ExponentialBackoff","Backing off for "+i+" ms (base delay: "+this.currentBaseMs+" ms, delay with jitter: "+n+" ms, last attempt: "+r+" ms ago)"),this.timerPromise=this.queue.enqueueAfterDelay(this.timerId,i,function(){return e.lastAttemptTime=Date.now(),t()}),this.currentBaseMs*=this.backoffFactor,this.currentBaseMs<this.initialDelayMs&&(this.currentBaseMs=this.initialDelayMs),this.currentBaseMs>this.maxDelayMs&&(this.currentBaseMs=this.maxDelayMs);},Ph.prototype.cancel=function(){null!==this.timerPromise&&(this.timerPromise.cancel(),this.timerPromise=null);},Ph.prototype.jitterDelayMs=function(){return (Math.random()-.5)*this.currentBaseMs},Ph);function Ph(t,e,n,r,i){void 0===n&&(n=1e3),void 0===r&&(r=1.5),void 0===i&&(i=6e4),this.queue=t,this.timerId=e,this.initialDelayMs=n,this.backoffFactor=r,this.maxDelayMs=i,this.currentBaseMs=0,this.timerPromise=null,this.lastAttemptTime=Date.now(),this.reset();}var xh,Fh,qh="PersistentStream";(Fh=xh=xh||{})[Fh.Initial=0]="Initial",Fh[Fh.Starting=1]="Starting",Fh[Fh.Open=2]="Open",Fh[Fh.Error=3]="Error",Fh[Fh.Backoff=4]="Backoff";var Vh=(Bh.prototype.isStarted=function(){return this.state===xh.Starting||this.state===xh.Open||this.state===xh.Backoff},Bh.prototype.isOpen=function(){return this.state===xh.Open},Bh.prototype.start=function(){this.state!==xh.Error?(Ur(this.state===xh.Initial,"Already started"),this.auth()):this.performBackoff();},Bh.prototype.stop=function(){return p(this,void 0,void 0,function(){return m(this,function(t){switch(t.label){case 0:return this.isStarted()?[4,this.close(xh.Initial)]:[3,2];case 1:t.sent(),t.label=2;case 2:return [2]}})})},Bh.prototype.inhibitBackoff=function(){Ur(!this.isStarted(),"Can only inhibit backoff in a stopped state"),this.state=xh.Initial,this.backoff.reset();},Bh.prototype.markIdle=function(){var t=this;this.isOpen()&&null===this.idleTimer&&(this.idleTimer=this.queue.enqueueAfterDelay(this.idleTimerId,6e4,function(){return t.handleIdleCloseTimer()}));},Bh.prototype.sendRequest=function(t){this.cancelIdleCheck(),this.stream.send(t);},Bh.prototype.handleIdleCloseTimer=function(){return p(this,void 0,void 0,function(){return m(this,function(t){return this.isOpen()?[2,this.close(xh.Initial)]:[2]})})},Bh.prototype.cancelIdleCheck=function(){this.idleTimer&&(this.idleTimer.cancel(),this.idleTimer=null);},Bh.prototype.close=function(e,n){return p(this,void 0,void 0,function(){return m(this,function(t){switch(t.label){case 0:return Ur(this.isStarted(),"Only started streams should be closed."),Ur(e===xh.Error||Ic(n),"Can't provide an error when not in an error state."),this.cancelIdleCheck(),this.backoff.cancel(),this.closeCount++,e!==xh.Error?this.backoff.reset():n&&n.code===Gr.RESOURCE_EXHAUSTED?(qr(n.toString()),qr("Using maximum backoff delay to prevent overloading the backend."),this.backoff.resetToMax()):n&&n.code===Gr.UNAUTHENTICATED&&this.credentialsProvider.invalidateToken(),null!==this.stream&&(this.tearDown(),this.stream.close(),this.stream=null),this.state=e,[4,this.listener.onClose(n)];case 1:return t.sent(),[2]}})})},Bh.prototype.tearDown=function(){},Bh.prototype.auth=function(){var n=this;Ur(this.state===xh.Initial,"Must be in initial state to auth"),this.state=xh.Starting;var t=this.getCloseGuardedDispatcher(this.closeCount),e=this.closeCount;this.credentialsProvider.getToken().then(function(t){n.closeCount===e&&n.startStream(t);},function(e){t(function(){var t=new zr(Gr.UNKNOWN,"Fetching auth token failed: "+e.message);return n.handleStreamClose(t)});});},Bh.prototype.startStream=function(t){var e=this;Ur(this.state===xh.Starting,"Trying to start stream in a non-starting state");var n=this.getCloseGuardedDispatcher(this.closeCount);this.stream=this.startRpc(t),this.stream.onOpen(function(){n(function(){return Ur(e.state===xh.Starting,"Expected stream to be in state Starting, but was "+e.state),e.state=xh.Open,e.listener.onOpen()});}),this.stream.onClose(function(t){n(function(){return e.handleStreamClose(t)});}),this.stream.onMessage(function(t){n(function(){return e.onMessage(t)});});},Bh.prototype.performBackoff=function(){var t=this;Ur(this.state===xh.Error,"Should only perform backoff when in Error state"),this.state=xh.Backoff,this.backoff.backoffAndRun(function(){return p(t,void 0,void 0,function(){return m(this,function(t){return Ur(this.state===xh.Backoff,"Backoff elapsed but state is now: "+this.state),this.state=xh.Initial,this.start(),Ur(this.isStarted(),"PersistentStream should have started"),[2]})})});},Bh.prototype.handleStreamClose=function(t){return Ur(this.isStarted(),"Can't handle server close on non-started stream"),Fr(qh,"close with error: "+t),this.stream=null,this.close(xh.Error,t)},Bh.prototype.getCloseGuardedDispatcher=function(e){var n=this;return function(t){n.queue.enqueueAndForget(function(){return n.closeCount===e?t():(Fr(qh,"stream callback skipped by getCloseGuardedDispatcher."),Promise.resolve())});}},Bh);function Bh(t,e,n,r,i,o){this.queue=t,this.idleTimerId=n,this.connection=r,this.credentialsProvider=i,this.listener=o,this.state=xh.Initial,this.closeCount=0,this.idleTimer=null,this.stream=null,this.backoff=new Oh(t,e);}var Uh,Kh=(t(Qh,Uh=Vh),Qh.prototype.startRpc=function(t){return this.connection.openStream("Listen",t)},Qh.prototype.onMessage=function(t){this.backoff.reset();var e=this.serializer.fromWatchChange(t),n=this.serializer.versionFromListenResponse(t);return this.listener.onWatchChange(e,n)},Qh.prototype.watch=function(t){var e={};e.database=this.serializer.encodedDatabaseId,e.addTarget=this.serializer.toTarget(t);var n=this.serializer.toListenRequestLabels(t);n&&(e.labels=n),this.sendRequest(e);},Qh.prototype.unwatch=function(t){var e={};e.database=this.serializer.encodedDatabaseId,e.removeTarget=t,this.sendRequest(e);},Qh);function Qh(t,e,n,r,i){var o=Uh.call(this,t,Hi.ListenStreamConnectionBackoff,Hi.ListenStreamIdle,e,n,i)||this;return o.serializer=r,o}var Wh,jh=(t(Gh,Wh=Vh),Object.defineProperty(Gh.prototype,"handshakeComplete",{get:function(){return this.handshakeComplete_},enumerable:!0,configurable:!0}),Gh.prototype.start=function(){this.handshakeComplete_=!1,Wh.prototype.start.call(this);},Gh.prototype.tearDown=function(){this.handshakeComplete_&&this.writeMutations([]);},Gh.prototype.startRpc=function(t){return this.connection.openStream("Write",t)},Gh.prototype.onMessage=function(t){if(Ur(!!t.streamToken,"Got a write response without a stream token"),this.lastStreamToken=t.streamToken,this.handshakeComplete_){this.backoff.reset();var e=this.serializer.fromWriteResults(t.writeResults,t.commitTime),n=this.serializer.fromVersion(t.commitTime);return this.listener.onMutationResult(n,e)}return Ur(!t.writeResults||0===t.writeResults.length,"Got mutation results for handshake"),this.handshakeComplete_=!0,this.listener.onHandshakeComplete()},Gh.prototype.writeHandshake=function(){Ur(this.isOpen(),"Writing handshake requires an opened stream"),Ur(!this.handshakeComplete_,"Handshake already completed");var t={};t.database=this.serializer.encodedDatabaseId,this.sendRequest(t);},Gh.prototype.writeMutations=function(t){var e=this;Ur(this.isOpen(),"Writing mutations requires an opened stream"),Ur(this.handshakeComplete_,"Handshake must be complete before writing mutations"),Ur(0<this.lastStreamToken.length,"Trying to write mutation without a token");var n={streamToken:this.lastStreamToken,writes:t.map(function(t){return e.serializer.toMutation(t)})};this.sendRequest(n);},Gh);function Gh(t,e,n,r,i){var o=Wh.call(this,t,Hi.WriteStreamConnectionBackoff,Hi.WriteStreamIdle,e,n,i)||this;return o.serializer=r,o.handshakeComplete_=!1,o.lastStreamToken=Wr(),o}var zh=(Hh.prototype.newPersistentWriteStream=function(t){return new jh(this.queue,this.connection,this.credentials,this.serializer,t)},Hh.prototype.newPersistentWatchStream=function(t){return new Kh(this.queue,this.connection,this.credentials,this.serializer,t)},Hh.prototype.commit=function(t){var e=this,n={database:this.serializer.encodedDatabaseId,writes:t.map(function(t){return e.serializer.toMutation(t)})};return this.invokeRPC("Commit",n).then(function(t){return e.serializer.fromWriteResults(t.writeResults,t.commitTime)})},Hh.prototype.lookup=function(e){var i=this,t={database:this.serializer.encodedDatabaseId,documents:e.map(function(t){return i.serializer.toName(t)})};return this.invokeStreamingRPC("BatchGetDocuments",t).then(function(t){var n=No();t.forEach(function(t){var e=i.serializer.fromMaybeDocument(t);n=n.insert(e.key,e);});var r=[];return e.forEach(function(t){var e=n.get(t);Ur(!!e,"Missing entity in write response for "+t),r.push(e);}),r})},Hh.prototype.invokeRPC=function(e,n){var r=this;return this.credentials.getToken().then(function(t){return r.connection.invokeRPC(e,n,t)}).catch(function(t){throw t.code===Gr.UNAUTHENTICATED&&r.credentials.invalidateToken(),t})},Hh.prototype.invokeStreamingRPC=function(e,n){var r=this;return this.credentials.getToken().then(function(t){return r.connection.invokeStreamingRPC(e,n,t)}).catch(function(t){throw t.code===Gr.UNAUTHENTICATED&&r.credentials.invalidateToken(),t})},Hh);function Hh(t,e,n,r){this.queue=t,this.connection=e,this.credentials=n,this.serializer=r;}var Yh,Jh,Xh,Zh,$h=(tl.prototype.lookup=function(r){return p(this,void 0,void 0,function(){var e,n=this;return m(this,function(t){switch(t.label){case 0:if(this.ensureCommitNotCalled(),0<this.mutations.length)throw new zr(Gr.INVALID_ARGUMENT,"Firestore transactions require all reads to be executed before all writes.");return [4,this.datastore.lookup(r)];case 1:return (e=t.sent()).forEach(function(t){t instanceof Ks||t instanceof Vs?n.recordVersion(t):Br("Document in a transaction was a "+t.constructor.name);}),[2,e]}})})},tl.prototype.set=function(t,e){this.write(e.toMutations(t,this.precondition(t))),this.writtenDocs.add(t);},tl.prototype.update=function(t,e){try{this.write(e.toMutations(t,this.preconditionForUpdate(t)));}catch(t){this.lastWriteError=t;}this.writtenDocs.add(t);},tl.prototype.delete=function(t){this.write([new Wa(t,this.precondition(t))]),this.writtenDocs.add(t);},tl.prototype.commit=function(){return p(this,void 0,void 0,function(){var e;return m(this,function(t){switch(t.label){case 0:if(this.ensureCommitNotCalled(),this.lastWriteError)throw this.lastWriteError;if(e=this.readVersions,this.mutations.forEach(function(t){e=e.remove(t.key);}),!e.isEmpty())throw new zr(Gr.INVALID_ARGUMENT,"Every document read in a transaction must also be written.");return [4,this.datastore.commit(this.mutations)];case 1:return t.sent(),this.committed=!0,[2]}})})},tl.prototype.recordVersion=function(t){var e;if(t instanceof Vs)e=t.version;else{if(!(t instanceof Ks))throw Br("Document in a transaction was a "+t.constructor.name);e=lo.forDeletedDoc();}var n=this.readVersions.get(t.key);if(null!==n){if(!e.isEqual(n))throw new zr(Gr.ABORTED,"Document version changed between two reads.")}else this.readVersions=this.readVersions.insert(t.key,e);},tl.prototype.precondition=function(t){var e=this.readVersions.get(t);return !this.writtenDocs.has(t)&&e?Da.updateTime(e):Da.NONE},tl.prototype.preconditionForUpdate=function(t){var e=this.readVersions.get(t);if(this.writtenDocs.has(t)||!e)return Da.exists(!0);if(e.isEqual(lo.forDeletedDoc()))throw new zr(Gr.INVALID_ARGUMENT,"Can't update a document that doesn't exist.");return Da.updateTime(e)},tl.prototype.write=function(t){this.ensureCommitNotCalled(),this.mutations=this.mutations.concat(t);},tl.prototype.ensureCommitNotCalled=function(){Ur(!this.committed,"A transaction object cannot be used after its update callback has been invoked.");},tl);function tl(t){this.datastore=t,this.readVersions=_o(),this.mutations=[],this.committed=!1,this.lastWriteError=null,this.writtenDocs=new Set;}(Jh=Yh=Yh||{})[Jh.Unknown=0]="Unknown",Jh[Jh.Online=1]="Online",Jh[Jh.Offline=2]="Offline",(Zh=Xh=Xh||{})[Zh.RemoteStore=0]="RemoteStore",Zh[Zh.SharedClientState=1]="SharedClientState";var el,nl,rl=(il.prototype.handleWatchStreamStart=function(){var t=this;0===this.watchStreamFailures&&(this.setAndBroadcast(Yh.Unknown),Ur(null===this.onlineStateTimer,"onlineStateTimer shouldn't be started yet"),this.onlineStateTimer=this.asyncQueue.enqueueAfterDelay(Hi.OnlineStateTimeout,1e4,function(){return t.onlineStateTimer=null,Ur(t.state===Yh.Unknown,"Timer should be canceled if we transitioned to a different state."),t.logClientOfflineWarningIfNecessary("Backend didn't respond within 10 seconds."),t.setAndBroadcast(Yh.Offline),Promise.resolve()}));},il.prototype.handleWatchStreamFailure=function(t){this.state===Yh.Online?(this.setAndBroadcast(Yh.Unknown),Ur(0===this.watchStreamFailures,"watchStreamFailures must be 0"),Ur(null===this.onlineStateTimer,"onlineStateTimer must be null")):(this.watchStreamFailures++,1<=this.watchStreamFailures&&(this.clearOnlineStateTimer(),this.logClientOfflineWarningIfNecessary("Connection failed 1 times. Most recent error: "+t.toString()),this.setAndBroadcast(Yh.Offline)));},il.prototype.set=function(t){this.clearOnlineStateTimer(),this.watchStreamFailures=0,t===Yh.Online&&(this.shouldWarnClientIsOffline=!1),this.setAndBroadcast(t);},il.prototype.setAndBroadcast=function(t){t!==this.state&&(this.state=t,this.onlineStateHandler(t));},il.prototype.logClientOfflineWarningIfNecessary=function(t){var e="Could not reach Cloud Firestore backend. "+t+"\nThis typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.";this.shouldWarnClientIsOffline?(qr(e),this.shouldWarnClientIsOffline=!1):Fr("OnlineStateTracker",e);},il.prototype.clearOnlineStateTimer=function(){null!==this.onlineStateTimer&&(this.onlineStateTimer.cancel(),this.onlineStateTimer=null);},il);function il(t,e){this.asyncQueue=t,this.onlineStateHandler=e,this.state=Yh.Unknown,this.watchStreamFailures=0,this.onlineStateTimer=null,this.shouldWarnClientIsOffline=!0;}function ol(t){switch(t){case Gr.OK:return Br("Treated status OK as error");case Gr.CANCELLED:case Gr.UNKNOWN:case Gr.DEADLINE_EXCEEDED:case Gr.RESOURCE_EXHAUSTED:case Gr.INTERNAL:case Gr.UNAVAILABLE:case Gr.UNAUTHENTICATED:return !1;case Gr.INVALID_ARGUMENT:case Gr.NOT_FOUND:case Gr.ALREADY_EXISTS:case Gr.PERMISSION_DENIED:case Gr.FAILED_PRECONDITION:case Gr.ABORTED:case Gr.OUT_OF_RANGE:case Gr.UNIMPLEMENTED:case Gr.DATA_LOSS:return !0;default:return Br("Unknown status code: "+t)}}function al(t){if(void 0===t)return qr("GRPC error has no .code"),Gr.UNKNOWN;switch(t){case el.OK:return Gr.OK;case el.CANCELLED:return Gr.CANCELLED;case el.UNKNOWN:return Gr.UNKNOWN;case el.DEADLINE_EXCEEDED:return Gr.DEADLINE_EXCEEDED;case el.RESOURCE_EXHAUSTED:return Gr.RESOURCE_EXHAUSTED;case el.INTERNAL:return Gr.INTERNAL;case el.UNAVAILABLE:return Gr.UNAVAILABLE;case el.UNAUTHENTICATED:return Gr.UNAUTHENTICATED;case el.INVALID_ARGUMENT:return Gr.INVALID_ARGUMENT;case el.NOT_FOUND:return Gr.NOT_FOUND;case el.ALREADY_EXISTS:return Gr.ALREADY_EXISTS;case el.PERMISSION_DENIED:return Gr.PERMISSION_DENIED;case el.FAILED_PRECONDITION:return Gr.FAILED_PRECONDITION;case el.ABORTED:return Gr.ABORTED;case el.OUT_OF_RANGE:return Gr.OUT_OF_RANGE;case el.UNIMPLEMENTED:return Gr.UNIMPLEMENTED;case el.DATA_LOSS:return Gr.DATA_LOSS;default:return Br("Unknown status code: "+t)}}(nl=el=el||{})[nl.OK=0]="OK",nl[nl.CANCELLED=1]="CANCELLED",nl[nl.UNKNOWN=2]="UNKNOWN",nl[nl.INVALID_ARGUMENT=3]="INVALID_ARGUMENT",nl[nl.DEADLINE_EXCEEDED=4]="DEADLINE_EXCEEDED",nl[nl.NOT_FOUND=5]="NOT_FOUND",nl[nl.ALREADY_EXISTS=6]="ALREADY_EXISTS",nl[nl.PERMISSION_DENIED=7]="PERMISSION_DENIED",nl[nl.UNAUTHENTICATED=16]="UNAUTHENTICATED",nl[nl.RESOURCE_EXHAUSTED=8]="RESOURCE_EXHAUSTED",nl[nl.FAILED_PRECONDITION=9]="FAILED_PRECONDITION",nl[nl.ABORTED=10]="ABORTED",nl[nl.OUT_OF_RANGE=11]="OUT_OF_RANGE",nl[nl.UNIMPLEMENTED=12]="UNIMPLEMENTED",nl[nl.INTERNAL=13]="INTERNAL",nl[nl.UNAVAILABLE=14]="UNAVAILABLE",nl[nl.DATA_LOSS=15]="DATA_LOSS";var sl,ul,cl,hl,ll=(fl.emptySet=function(t){return new fl(t.comparator)},fl.prototype.has=function(t){return null!=this.keyedMap.get(t)},fl.prototype.get=function(t){return this.keyedMap.get(t)},fl.prototype.first=function(){return this.sortedSet.minKey()},fl.prototype.last=function(){return this.sortedSet.maxKey()},fl.prototype.isEmpty=function(){return this.sortedSet.isEmpty()},fl.prototype.indexOf=function(t){var e=this.keyedMap.get(t);return e?this.sortedSet.indexOf(e):-1},Object.defineProperty(fl.prototype,"size",{get:function(){return this.sortedSet.size},enumerable:!0,configurable:!0}),fl.prototype.forEach=function(n){this.sortedSet.inorderTraversal(function(t,e){return n(t),!1});},fl.prototype.add=function(t){var e=this.delete(t.key);return e.copy(e.keyedMap.insert(t.key,t),e.sortedSet.insert(t,null))},fl.prototype.delete=function(t){var e=this.get(t);return e?this.copy(this.keyedMap.remove(t),this.sortedSet.remove(e)):this},fl.prototype.isEqual=function(t){if(!(t instanceof fl))return !1;if(this.size!==t.size)return !1;for(var e=this.sortedSet.getIterator(),n=t.sortedSet.getIterator();e.hasNext();){var r=e.getNext().key,i=n.getNext().key;if(!r.isEqual(i))return !1}return !0},fl.prototype.toString=function(){var e=[];return this.forEach(function(t){e.push(t.toString());}),0===e.length?"DocumentSet ()":"DocumentSet (\n  "+e.join("  \n")+"\n)"},fl.prototype.copy=function(t,e){var n=new fl;return n.comparator=this.comparator,n.keyedMap=t,n.sortedSet=e,n},fl);function fl(n){this.comparator=n?function(t,e){return n(t,e)||Gi.comparator(t.key,e.key)}:function(t,e){return Gi.comparator(t.key,e.key)},this.keyedMap=Ro(),this.sortedSet=new po(this.comparator);}(ul=sl=sl||{})[ul.Added=0]="Added",ul[ul.Removed=1]="Removed",ul[ul.Modified=2]="Modified",ul[ul.Metadata=3]="Metadata",(hl=cl=cl||{})[hl.Local=0]="Local",hl[hl.Synced=1]="Synced";var pl=(dl.prototype.track=function(t){var e=t.doc.key,n=this.changeMap.get(e);n?t.type!==sl.Added&&n.type===sl.Metadata?this.changeMap=this.changeMap.insert(e,t):t.type===sl.Metadata&&n.type!==sl.Removed?this.changeMap=this.changeMap.insert(e,{type:n.type,doc:t.doc}):t.type===sl.Modified&&n.type===sl.Modified?this.changeMap=this.changeMap.insert(e,{type:sl.Modified,doc:t.doc}):t.type===sl.Modified&&n.type===sl.Added?this.changeMap=this.changeMap.insert(e,{type:sl.Added,doc:t.doc}):t.type===sl.Removed&&n.type===sl.Added?this.changeMap=this.changeMap.remove(e):t.type===sl.Removed&&n.type===sl.Modified?this.changeMap=this.changeMap.insert(e,{type:sl.Removed,doc:n.doc}):t.type===sl.Added&&n.type===sl.Removed?this.changeMap=this.changeMap.insert(e,{type:sl.Modified,doc:t.doc}):Br("unsupported combination of changes: "+JSON.stringify(t)+" after "+JSON.stringify(n)):this.changeMap=this.changeMap.insert(e,t);},dl.prototype.getChanges=function(){var n=[];return this.changeMap.inorderTraversal(function(t,e){n.push(e);}),n},dl);function dl(){this.changeMap=new po(Gi.comparator);}var ml=(yl.fromInitialDocuments=function(t,e,n,r){var i=[];return e.forEach(function(t){i.push({type:sl.Added,doc:t});}),new yl(t,e,ll.emptySet(e),i,n,r,!0,!1)},Object.defineProperty(yl.prototype,"hasPendingWrites",{get:function(){return !this.mutatedKeys.isEmpty()},enumerable:!0,configurable:!0}),yl.prototype.isEqual=function(t){if(!(this.fromCache===t.fromCache&&this.syncStateChanged===t.syncStateChanged&&this.mutatedKeys.isEqual(t.mutatedKeys)&&this.query.isEqual(t.query)&&this.docs.isEqual(t.docs)&&this.oldDocs.isEqual(t.oldDocs)))return !1;var e=this.docChanges,n=t.docChanges;if(e.length!==n.length)return !1;for(var r=0;r<e.length;r++)if(e[r].type!==n[r].type||!e[r].doc.isEqual(n[r].doc))return !1;return !0},yl);function yl(t,e,n,r,i,o,a,s){this.query=t,this.docs=e,this.oldDocs=n,this.docChanges=r,this.mutatedKeys=i,this.fromCache=o,this.syncStateChanged=a,this.excludesMetadataChanges=s;}var gl=(vl.createSynthesizedRemoteEventForCurrentChange=function(t,e){var n,r=((n={})[t]=bl.createSynthesizedTargetChangeForCurrentChange(t,e),n);return new vl(lo.MIN,r,xo(),No(),Oo())},vl);function vl(t,e,n,r,i){this.snapshotVersion=t,this.targetChanges=e,this.targetMismatches=n,this.documentUpdates=r,this.resolvedLimboDocuments=i;}var bl=(wl.createSynthesizedTargetChangeForCurrentChange=function(t,e){return new wl(Wr(),e,Oo(),Oo(),Oo())},wl);function wl(t,e,n,r,i){this.resumeToken=t,this.current=e,this.addedDocuments=n,this.modifiedDocuments=r,this.removedDocuments=i;}var Tl,Sl,El=function(t,e,n,r){this.updatedTargetIds=t,this.removedTargetIds=e,this.key=n,this.newDoc=r;},Il=function(t,e){this.targetId=t,this.existenceFilter=e;};(Sl=Tl=Tl||{})[Sl.NoChange=0]="NoChange",Sl[Sl.Added=1]="Added",Sl[Sl.Removed=2]="Removed",Sl[Sl.Current=3]="Current",Sl[Sl.Reset=4]="Reset";var Cl=function(t,e,n,r){void 0===n&&(n=Wr()),void 0===r&&(r=null),this.state=t,this.targetIds=e,this.resumeToken=n,this.cause=r;},Dl=(Object.defineProperty(Nl.prototype,"current",{get:function(){return this._current},enumerable:!0,configurable:!0}),Object.defineProperty(Nl.prototype,"resumeToken",{get:function(){return this._resumeToken},enumerable:!0,configurable:!0}),Object.defineProperty(Nl.prototype,"isPending",{get:function(){return 0!==this.pendingResponses},enumerable:!0,configurable:!0}),Object.defineProperty(Nl.prototype,"hasPendingChanges",{get:function(){return this._hasPendingChanges},enumerable:!0,configurable:!0}),Nl.prototype.updateResumeToken=function(t){0<t.length&&(this._hasPendingChanges=!0,this._resumeToken=t);},Nl.prototype.toTargetChange=function(){var n=Oo(),r=Oo(),i=Oo();return this.documentChanges.forEach(function(t,e){switch(e){case sl.Added:n=n.add(t);break;case sl.Modified:r=r.add(t);break;case sl.Removed:i=i.add(t);break;default:Br("Encountered invalid change type: "+e);}}),new bl(this._resumeToken,this._current,n,r,i)},Nl.prototype.clearPendingChanges=function(){this._hasPendingChanges=!1,this.documentChanges=Ml();},Nl.prototype.addDocumentChange=function(t,e){this._hasPendingChanges=!0,this.documentChanges=this.documentChanges.insert(t,e);},Nl.prototype.removeDocumentChange=function(t){this._hasPendingChanges=!0,this.documentChanges=this.documentChanges.remove(t);},Nl.prototype.recordPendingTargetRequest=function(){this.pendingResponses+=1;},Nl.prototype.recordTargetResponse=function(){this.pendingResponses-=1;},Nl.prototype.markCurrent=function(){this._hasPendingChanges=!0,this._current=!0;},Nl);function Nl(){this.pendingResponses=0,this.documentChanges=Ml(),this._resumeToken=Wr(),this._current=!1,this._hasPendingChanges=!0;}var Al=(kl.prototype.handleDocumentChange=function(t){for(var e=0,n=t.updatedTargetIds;e<n.length;e++){var r=n[e];t.newDoc instanceof Vs?this.addDocumentToTarget(r,t.newDoc):t.newDoc instanceof Ks&&this.removeDocumentFromTarget(r,t.key,t.newDoc);}for(var i=0,o=t.removedTargetIds;i<o.length;i++)r=o[i],this.removeDocumentFromTarget(r,t.key,t.newDoc);},kl.prototype.handleTargetChange=function(n){var r=this;this.forEachTarget(n,function(t){var e=r.ensureTargetState(t);switch(n.state){case Tl.NoChange:r.isActiveTarget(t)&&e.updateResumeToken(n.resumeToken);break;case Tl.Added:e.recordTargetResponse(),e.isPending||e.clearPendingChanges(),e.updateResumeToken(n.resumeToken);break;case Tl.Removed:e.recordTargetResponse(),e.isPending||r.removeTarget(t),Ur(!n.cause,"WatchChangeAggregator does not handle errored targets");break;case Tl.Current:r.isActiveTarget(t)&&(e.markCurrent(),e.updateResumeToken(n.resumeToken));break;case Tl.Reset:r.isActiveTarget(t)&&(r.resetTarget(t),e.updateResumeToken(n.resumeToken));break;default:Br("Unknown target watch change state: "+n.state);}});},kl.prototype.forEachTarget=function(t,e){0<t.targetIds.length?t.targetIds.forEach(e):Zr(this.targetStates,e);},kl.prototype.handleExistenceFilter=function(t){var e=t.targetId,n=t.existenceFilter.count,r=this.targetDataForActiveTarget(e);if(r){var i=r.target;if(i.isDocumentQuery())if(0===n){var o=new Gi(i.path);this.removeDocumentFromTarget(e,o,new Ks(o,lo.forDeletedDoc()));}else Ur(1===n,"Single document existence filter with count: "+n);else this.getCurrentDocumentCountForTarget(e)!==n&&(this.resetTarget(e),this.pendingTargetResets=this.pendingTargetResets.add(e));}},kl.prototype.createRemoteEvent=function(i){var o=this,a={};Zr(this.targetStates,function(t,e){var n=o.targetDataForActiveTarget(t);if(n){if(e.current&&n.target.isDocumentQuery()){var r=new Gi(n.target.path);null!==o.pendingDocumentUpdates.get(r)||o.targetContainsDocument(t,r)||o.removeDocumentFromTarget(t,r,new Ks(r,i));}e.hasPendingChanges&&(a[t]=e.toTargetChange(),e.clearPendingChanges());}});var r=Oo();this.pendingDocumentTargetMapping.forEach(function(t,e){var n=!0;e.forEachWhile(function(t){var e=o.targetDataForActiveTarget(t);return !e||e.purpose===qu.LimboResolution||(n=!1)}),n&&(r=r.add(t));});var t=new gl(i,a,this.pendingTargetResets,this.pendingDocumentUpdates,r);return this.pendingDocumentUpdates=No(),this.pendingDocumentTargetMapping=Rl(),this.pendingTargetResets=new So(Si),t},kl.prototype.addDocumentToTarget=function(t,e){if(this.isActiveTarget(t)){var n=this.targetContainsDocument(t,e.key)?sl.Modified:sl.Added;this.ensureTargetState(t).addDocumentChange(e.key,n),this.pendingDocumentUpdates=this.pendingDocumentUpdates.insert(e.key,e),this.pendingDocumentTargetMapping=this.pendingDocumentTargetMapping.insert(e.key,this.ensureDocumentTargetMapping(e.key).add(t));}},kl.prototype.removeDocumentFromTarget=function(t,e,n){if(this.isActiveTarget(t)){var r=this.ensureTargetState(t);this.targetContainsDocument(t,e)?r.addDocumentChange(e,sl.Removed):r.removeDocumentChange(e),this.pendingDocumentTargetMapping=this.pendingDocumentTargetMapping.insert(e,this.ensureDocumentTargetMapping(e).delete(t)),n&&(this.pendingDocumentUpdates=this.pendingDocumentUpdates.insert(e,n));}},kl.prototype.removeTarget=function(t){delete this.targetStates[t];},kl.prototype.getCurrentDocumentCountForTarget=function(t){var e=this.ensureTargetState(t).toTargetChange();return this.metadataProvider.getRemoteKeysForTarget(t).size+e.addedDocuments.size-e.removedDocuments.size},kl.prototype.recordPendingTargetRequest=function(t){this.ensureTargetState(t).recordPendingTargetRequest();},kl.prototype.ensureTargetState=function(t){return this.targetStates[t]||(this.targetStates[t]=new Dl),this.targetStates[t]},kl.prototype.ensureDocumentTargetMapping=function(t){var e=this.pendingDocumentTargetMapping.get(t);return e||(e=new So(Si),this.pendingDocumentTargetMapping=this.pendingDocumentTargetMapping.insert(t,e)),e},kl.prototype.isActiveTarget=function(t){var e=null!==this.targetDataForActiveTarget(t);return e||Fr("WatchChangeAggregator","Detected inactive target",t),e},kl.prototype.targetDataForActiveTarget=function(t){var e=this.targetStates[t];return e&&e.isPending?null:this.metadataProvider.getTargetDataForTarget(t)},kl.prototype.resetTarget=function(e){var n=this;Ur(!this.targetStates[e].isPending,"Should only reset active targets"),this.targetStates[e]=new Dl,this.metadataProvider.getRemoteKeysForTarget(e).forEach(function(t){n.removeDocumentFromTarget(e,t,null);});},kl.prototype.targetContainsDocument=function(t,e){return this.metadataProvider.getRemoteKeysForTarget(t).has(e)},kl);function kl(t){this.metadataProvider=t,this.targetStates={},this.pendingDocumentUpdates=No(),this.pendingDocumentTargetMapping=Rl(),this.pendingTargetResets=new So(Si);}function Rl(){return new po(Gi.comparator)}function Ml(){return new po(Gi.comparator)}var _l="RemoteStore",Ll=(Ol.prototype.start=function(){return this.enableNetwork()},Ol.prototype.enableNetwork=function(){return p(this,void 0,void 0,function(){var e;return m(this,function(t){switch(t.label){case 0:return this.networkEnabled=!0,this.canUseNetwork()?(e=this.writeStream,[4,this.localStore.getLastStreamToken()]):[3,3];case 1:return e.lastStreamToken=t.sent(),this.shouldStartWatchStream()?this.startWatchStream():this.onlineStateTracker.set(Yh.Unknown),[4,this.fillWritePipeline()];case 2:t.sent(),t.label=3;case 3:return [2]}})})},Ol.prototype.disableNetwork=function(){return p(this,void 0,void 0,function(){return m(this,function(t){switch(t.label){case 0:return this.networkEnabled=!1,[4,this.disableNetworkInternal()];case 1:return t.sent(),this.onlineStateTracker.set(Yh.Offline),[2]}})})},Ol.prototype.disableNetworkInternal=function(){return p(this,void 0,void 0,function(){return m(this,function(t){switch(t.label){case 0:return [4,this.writeStream.stop()];case 1:return t.sent(),[4,this.watchStream.stop()];case 2:return t.sent(),0<this.writePipeline.length&&(Fr(_l,"Stopping write stream with "+this.writePipeline.length+" pending writes"),this.writePipeline=[]),this.cleanUpWatchStreamState(),[2]}})})},Ol.prototype.shutdown=function(){return p(this,void 0,void 0,function(){return m(this,function(t){switch(t.label){case 0:return Fr(_l,"RemoteStore shutting down."),this.networkEnabled=!1,[4,this.disableNetworkInternal()];case 1:return t.sent(),this.connectivityMonitor.shutdown(),this.onlineStateTracker.set(Yh.Unknown),[2]}})})},Ol.prototype.listen=function(t){Jr(this.listenTargets,t.targetId)||(this.listenTargets[t.targetId]=t,this.shouldStartWatchStream()?this.startWatchStream():this.watchStream.isOpen()&&this.sendWatchRequest(t));},Ol.prototype.unlisten=function(t){Ur(Jr(this.listenTargets,t),"unlisten called on target no currently watched: "+t),delete this.listenTargets[t],this.watchStream.isOpen()&&this.sendUnwatchRequest(t),ti(this.listenTargets)&&(this.watchStream.isOpen()?this.watchStream.markIdle():this.canUseNetwork()&&this.onlineStateTracker.set(Yh.Unknown));},Ol.prototype.getTargetDataForTarget=function(t){return this.listenTargets[t]||null},Ol.prototype.getRemoteKeysForTarget=function(t){return this.syncEngine.getRemoteKeysForTarget(t)},Ol.prototype.sendWatchRequest=function(t){this.watchChangeAggregator.recordPendingTargetRequest(t.targetId),this.watchStream.watch(t);},Ol.prototype.sendUnwatchRequest=function(t){this.watchChangeAggregator.recordPendingTargetRequest(t),this.watchStream.unwatch(t);},Ol.prototype.startWatchStream=function(){Ur(this.shouldStartWatchStream(),"startWatchStream() called when shouldStartWatchStream() is false."),this.watchChangeAggregator=new Al(this),this.watchStream.start(),this.onlineStateTracker.handleWatchStreamStart();},Ol.prototype.shouldStartWatchStream=function(){return this.canUseNetwork()&&!this.watchStream.isStarted()&&!ti(this.listenTargets)},Ol.prototype.canUseNetwork=function(){return this.isPrimary&&this.networkEnabled},Ol.prototype.cleanUpWatchStreamState=function(){this.watchChangeAggregator=null;},Ol.prototype.onWatchStreamOpen=function(){return p(this,void 0,void 0,function(){var n=this;return m(this,function(t){return Zr(this.listenTargets,function(t,e){n.sendWatchRequest(e);}),[2]})})},Ol.prototype.onWatchStreamClose=function(e){return p(this,void 0,void 0,function(){return m(this,function(t){return void 0===e&&Ur(!this.shouldStartWatchStream(),"Watch stream was stopped gracefully while still needed."),this.cleanUpWatchStreamState(),this.shouldStartWatchStream()?(this.onlineStateTracker.handleWatchStreamFailure(e),this.startWatchStream()):this.onlineStateTracker.set(Yh.Unknown),[2]})})},Ol.prototype.onWatchStreamChange=function(n,r){return p(this,void 0,void 0,function(){var e;return m(this,function(t){switch(t.label){case 0:return this.onlineStateTracker.set(Yh.Online),n instanceof Cl&&n.state===Tl.Removed&&n.cause?[2,this.handleTargetError(n)]:(n instanceof El?this.watchChangeAggregator.handleDocumentChange(n):n instanceof Il?this.watchChangeAggregator.handleExistenceFilter(n):(Ur(n instanceof Cl,"Expected watchChange to be an instance of WatchTargetChange"),this.watchChangeAggregator.handleTargetChange(n)),r.isEqual(lo.MIN)?[3,3]:[4,this.localStore.getLastRemoteSnapshotVersion()]);case 1:return e=t.sent(),0<=r.compareTo(e)?[4,this.raiseWatchSnapshot(r)]:[3,3];case 2:t.sent(),t.label=3;case 3:return [2]}})})},Ol.prototype.raiseWatchSnapshot=function(r){var i=this;Ur(!r.isEqual(lo.MIN),"Can't raise event for unknown SnapshotVersion");var t=this.watchChangeAggregator.createRemoteEvent(r);return Zr(t.targetChanges,function(t,e){if(0<e.resumeToken.length){var n=i.listenTargets[t];n&&(i.listenTargets[t]=n.withResumeToken(e.resumeToken,r));}}),t.targetMismatches.forEach(function(t){var e=i.listenTargets[t];if(e){i.listenTargets[t]=e.withResumeToken(Wr(),e.snapshotVersion),i.sendUnwatchRequest(t);var n=new Wu(e.target,t,qu.ExistenceFilterMismatch,e.sequenceNumber);i.sendWatchRequest(n);}}),this.syncEngine.applyRemoteEvent(t)},Ol.prototype.handleTargetError=function(t){var n=this;Ur(!!t.cause,"Handling target error without a cause");var r=t.cause,i=Promise.resolve();return t.targetIds.forEach(function(e){i=i.then(function(){return p(n,void 0,void 0,function(){return m(this,function(t){return Jr(this.listenTargets,e)?(delete this.listenTargets[e],this.watchChangeAggregator.removeTarget(e),[2,this.syncEngine.rejectListen(e,r)]):[2]})})});}),i},Ol.prototype.fillWritePipeline=function(){return p(this,void 0,void 0,function(){var e,n;return m(this,function(t){switch(t.label){case 0:return this.canAddToWritePipeline()?(e=0<this.writePipeline.length?this.writePipeline[this.writePipeline.length-1].batchId:-1,[4,this.localStore.nextMutationBatch(e)]):[3,4];case 1:return null!==(n=t.sent())?[3,2]:(0===this.writePipeline.length&&this.writeStream.markIdle(),[3,4]);case 2:return this.addToWritePipeline(n),[4,this.fillWritePipeline()];case 3:t.sent(),t.label=4;case 4:return this.shouldStartWriteStream()&&this.startWriteStream(),[2]}})})},Ol.prototype.canAddToWritePipeline=function(){return this.canUseNetwork()&&this.writePipeline.length<10},Ol.prototype.outstandingWrites=function(){return this.writePipeline.length},Ol.prototype.addToWritePipeline=function(t){Ur(this.canAddToWritePipeline(),"addToWritePipeline called when pipeline is full"),this.writePipeline.push(t),this.writeStream.isOpen()&&this.writeStream.handshakeComplete&&this.writeStream.writeMutations(t.mutations);},Ol.prototype.shouldStartWriteStream=function(){return this.canUseNetwork()&&!this.writeStream.isStarted()&&0<this.writePipeline.length},Ol.prototype.startWriteStream=function(){Ur(this.shouldStartWriteStream(),"startWriteStream() called when shouldStartWriteStream() is false."),this.writeStream.start();},Ol.prototype.onWriteStreamOpen=function(){return p(this,void 0,void 0,function(){return m(this,function(t){return this.writeStream.writeHandshake(),[2]})})},Ol.prototype.onWriteHandshakeComplete=function(){var r=this;return this.localStore.setLastStreamToken(this.writeStream.lastStreamToken).then(function(){for(var t=0,e=r.writePipeline;t<e.length;t++){var n=e[t];r.writeStream.writeMutations(n.mutations);}}).catch(dc)},Ol.prototype.onMutationResult=function(t,e){var n=this;Ur(0<this.writePipeline.length,"Got result for empty write pipeline");var r=this.writePipeline.shift(),i=Vo.from(r,t,e,this.writeStream.lastStreamToken);return this.syncEngine.applySuccessfulWrite(i).then(function(){return n.fillWritePipeline()})},Ol.prototype.onWriteStreamClose=function(n){return p(this,void 0,void 0,function(){var e=this;return m(this,function(t){return void 0===n&&Ur(!this.shouldStartWriteStream(),"Write stream was stopped gracefully while still needed."),n&&0<this.writePipeline.length?[2,(this.writeStream.handshakeComplete?this.handleWriteError(n):this.handleHandshakeError(n)).then(function(){e.shouldStartWriteStream()&&e.startWriteStream();})]:[2]})})},Ol.prototype.handleHandshakeError=function(e){return p(this,void 0,void 0,function(){return m(this,function(t){return ol(e.code)?(Fr(_l,"RemoteStore error before completed handshake; resetting stream token: ",this.writeStream.lastStreamToken),this.writeStream.lastStreamToken=Wr(),[2,this.localStore.setLastStreamToken(Wr()).catch(dc)]):[2]})})},Ol.prototype.handleWriteError=function(r){return p(this,void 0,void 0,function(){var e,n=this;return m(this,function(t){return function(t){return ol(t)&&t!==Gr.ABORTED}(r.code)?(e=this.writePipeline.shift(),this.writeStream.inhibitBackoff(),[2,this.syncEngine.rejectFailedWrite(e.batchId,r).then(function(){return n.fillWritePipeline()})]):[2]})})},Ol.prototype.createTransaction=function(){return new $h(this.datastore)},Ol.prototype.restartNetwork=function(){return p(this,void 0,void 0,function(){return m(this,function(t){switch(t.label){case 0:return this.networkEnabled=!1,[4,this.disableNetworkInternal()];case 1:return t.sent(),this.onlineStateTracker.set(Yh.Unknown),[4,this.enableNetwork()];case 2:return t.sent(),[2]}})})},Ol.prototype.handleCredentialChange=function(){return p(this,void 0,void 0,function(){return m(this,function(t){switch(t.label){case 0:return this.canUseNetwork()?(Fr(_l,"RemoteStore restarting streams for new credential"),[4,this.restartNetwork()]):[3,2];case 1:t.sent(),t.label=2;case 2:return [2]}})})},Ol.prototype.applyPrimaryState=function(e){return p(this,void 0,void 0,function(){return m(this,function(t){switch(t.label){case 0:return (this.isPrimary=e)&&this.networkEnabled?[4,this.enableNetwork()]:[3,2];case 1:return t.sent(),[3,4];case 2:return e?[3,4]:[4,this.disableNetworkInternal()];case 3:t.sent(),this.onlineStateTracker.set(Yh.Unknown),t.label=4;case 4:return [2]}})})},Ol);function Ol(t,e,n,r,i){var o=this;this.localStore=t,this.datastore=e,this.writePipeline=[],this.listenTargets={},this.watchChangeAggregator=null,this.networkEnabled=!1,this.isPrimary=!1,this.connectivityMonitor=i,this.connectivityMonitor.addCallback(function(t){n.enqueueAndForget(function(){return p(o,void 0,void 0,function(){return m(this,function(t){switch(t.label){case 0:return this.canUseNetwork()?(Fr(_l,"Restarting streams for network reachability change."),[4,this.restartNetwork()]):[3,2];case 1:t.sent(),t.label=2;case 2:return [2]}})})});}),this.onlineStateTracker=new rl(n,r),this.watchStream=this.datastore.newPersistentWatchStream({onOpen:this.onWatchStreamOpen.bind(this),onClose:this.onWatchStreamClose.bind(this),onWatchChange:this.onWatchStreamChange.bind(this)}),this.writeStream=this.datastore.newPersistentWriteStream({onOpen:this.onWriteStreamOpen.bind(this),onClose:this.onWriteStreamClose.bind(this),onHandshakeComplete:this.onWriteHandshakeComplete.bind(this),onMutationResult:this.onMutationResult.bind(this)});}var Pl=(Object.defineProperty(xl.prototype,"latitude",{get:function(){return this._lat},enumerable:!0,configurable:!0}),Object.defineProperty(xl.prototype,"longitude",{get:function(){return this._long},enumerable:!0,configurable:!0}),xl.prototype.isEqual=function(t){return this._lat===t._lat&&this._long===t._long},xl.prototype._compareTo=function(t){return Si(this._lat,t._lat)||Si(this._long,t._long)},xl);function xl(t,e){if(ni("GeoPoint",arguments,2),oi("GeoPoint","number",1,t),oi("GeoPoint","number",2,e),!isFinite(t)||t<-90||90<t)throw new zr(Gr.INVALID_ARGUMENT,"Latitude must be a number between -90 and 90, but was: "+t);if(!isFinite(e)||e<-180||180<e)throw new zr(Gr.INVALID_ARGUMENT,"Longitude must be a number between -180 and 180, but was: "+e);this._lat=t,this._long=e;}var Fl=(ql.prototype.applyToLocalView=function(t,e){return new bs(e,t)},ql.prototype.applyToRemoteDocument=function(t,e){return e},ql.prototype.computeBaseValue=function(t){return null},ql.prototype.isEqual=function(t){return t instanceof ql},ql.instance=new ql,ql);function ql(){}var Vl=(Bl.prototype.applyToLocalView=function(t,e){return this.apply(t)},Bl.prototype.applyToRemoteDocument=function(t,e){return this.apply(t)},Bl.prototype.apply=function(t){for(var n=jl(t),e=function(e){n.find(function(t){return t.isEqual(e)})||n.push(e);},r=0,i=this.elements;r<i.length;r++)e(i[r]);return new Os(n)},Bl.prototype.computeBaseValue=function(t){return null},Bl.prototype.isEqual=function(t){return t instanceof Bl&&Ei(t.elements,this.elements)},Bl);function Bl(t){this.elements=t;}var Ul=(Kl.prototype.applyToLocalView=function(t,e){return this.apply(t)},Kl.prototype.applyToRemoteDocument=function(t,e){return this.apply(t)},Kl.prototype.apply=function(t){for(var n=jl(t),e=function(e){n=n.filter(function(t){return !t.isEqual(e)});},r=0,i=this.elements;r<i.length;r++)e(i[r]);return new Os(n)},Kl.prototype.computeBaseValue=function(t){return null},Kl.prototype.isEqual=function(t){return t instanceof Kl&&Ei(t.elements,this.elements)},Kl);function Kl(t){this.elements=t;}var Ql=(Wl.prototype.applyToLocalView=function(t,e){var n=this.computeBaseValue(t);if(n instanceof ss&&this.operand instanceof ss){var r=n.internalValue+this.operand.internalValue;return new ss(r)}return r=n.internalValue+this.operand.internalValue,new hs(r)},Wl.prototype.applyToRemoteDocument=function(t,e){return Ur(null!==e,"Didn't receive transformResult for NUMERIC_ADD transform"),e},Wl.prototype.computeBaseValue=function(t){return t instanceof rs?t:new ss(0)},Wl.prototype.isEqual=function(t){return t instanceof Wl&&this.operand.isEqual(t.operand)},Wl);function Wl(t){this.operand=t;}function jl(t){return t instanceof Os?t.internalValue.slice():[]}var Gl=(zl.prototype.isEqual=function(t){return t&&t.count===this.count},zl);function zl(t){this.count=t;}var Hl,Yl,Jl=((Hl={})[$c.ASCENDING.name]="ASCENDING",Hl[$c.DESCENDING.name]="DESCENDING",Hl),Xl=((Yl={})[Lc.LESS_THAN.name]="LESS_THAN",Yl[Lc.LESS_THAN_OR_EQUAL.name]="LESS_THAN_OR_EQUAL",Yl[Lc.GREATER_THAN.name]="GREATER_THAN",Yl[Lc.GREATER_THAN_OR_EQUAL.name]="GREATER_THAN_OR_EQUAL",Yl[Lc.EQUAL.name]="EQUAL",Yl[Lc.ARRAY_CONTAINS.name]="ARRAY_CONTAINS",Yl[Lc.IN.name]="IN",Yl[Lc.ARRAY_CONTAINS_ANY.name]="ARRAY_CONTAINS_ANY",Yl),Zl=new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);function $l(t,e){Ur(!Ic(t),e+" is missing");}function tf(t){return "number"==typeof t?t:"string"==typeof t?Number(t):Br("can't parse "+t)}var ef=(nf.prototype.emptyByteString=function(){return this.options.useProto3Json?"":new Uint8Array(0)},nf.prototype.unsafeCastProtoByteString=function(t){return t},nf.prototype.fromRpcStatus=function(t){var e=void 0===t.code?Gr.UNKNOWN:al(t.code);return new zr(e,t.message||"")},nf.prototype.toInt32Value=function(t){return this.options.useProto3Json||Ic(t)?t:{value:t}},nf.prototype.fromInt32Value=function(t){var e;return Ic(e="object"==typeof t?t.value:t)?null:e},nf.prototype.toTimestamp=function(t){return this.options.useProto3Json?new Date(1e3*t.seconds).toISOString().replace(/\.\d*/,"").replace("Z","")+"."+("000000000"+t.nanoseconds).slice(-9)+"Z":{seconds:""+t.seconds,nanos:t.nanoseconds}},nf.prototype.fromTimestamp=function(t){if("string"==typeof t)return this.fromIso8601String(t);Ur(!!t,"Cannot deserialize null or undefined timestamp.");var e=tf(t.seconds||"0"),n=t.nanos||0;return new co(e,n)},nf.prototype.fromIso8601String=function(t){var e=0,n=Zl.exec(t);if(Ur(!!n,"invalid timestamp: "+t),n[1]){var r=n[1];r=(r+"000000000").substr(0,9),e=Number(r);}var i=new Date(t),o=Math.floor(i.getTime()/1e3);return new co(o,e)},nf.prototype.toBytes=function(t){return this.options.useProto3Json?t.toBase64():this.unsafeCastProtoByteString(t.toUint8Array())},nf.prototype.fromBlob=function(t){return "string"==typeof t?(Ur(this.options.useProto3Json,"Expected bytes to be passed in as Uint8Array, but got a string instead."),Ni.fromBase64String(t)):(Ur(!this.options.useProto3Json,"Expected bytes to be passed in as Uint8Array, but got a string instead."),Ni.fromUint8Array(t))},nf.prototype.toVersion=function(t){return this.toTimestamp(t.toTimestamp())},nf.prototype.fromVersion=function(t){return Ur(!!t,"Trying to deserialize version that isn't set"),lo.fromTimestamp(this.fromTimestamp(t))},nf.prototype.toResourceName=function(t,e){return this.fullyQualifiedPrefixPath(t).child("documents").child(e).canonicalString()},nf.prototype.fromResourceName=function(t){var e=Bi.fromString(t);return Ur(this.isValidResourceName(e),"Tried to deserialize invalid key "+e.toString()),e},nf.prototype.toName=function(t){return this.toResourceName(this.databaseId,t.path)},nf.prototype.fromName=function(t){var e=this.fromResourceName(t);return Ur(e.get(1)===this.databaseId.projectId,"Tried to deserialize key from different project: "+e.get(1)+" vs "+this.databaseId.projectId),Ur(!e.get(3)&&!this.databaseId.database||e.get(3)===this.databaseId.database,"Tried to deserialize key from different database: "+e.get(3)+" vs "+this.databaseId.database),new Gi(this.extractLocalPathFromResourceName(e))},nf.prototype.toQueryPath=function(t){return this.toResourceName(this.databaseId,t)},nf.prototype.fromQueryPath=function(t){var e=this.fromResourceName(t);return 4===e.length?Bi.EMPTY_PATH:this.extractLocalPathFromResourceName(e)},Object.defineProperty(nf.prototype,"encodedDatabaseId",{get:function(){return new Bi(["projects",this.databaseId.projectId,"databases",this.databaseId.database]).canonicalString()},enumerable:!0,configurable:!0}),nf.prototype.fullyQualifiedPrefixPath=function(t){return new Bi(["projects",t.projectId,"databases",t.database])},nf.prototype.extractLocalPathFromResourceName=function(t){return Ur(4<t.length&&"documents"===t.get(4),"tried to deserialize invalid key "+t.toString()),t.popFirst(5)},nf.prototype.isValidResourceName=function(t){return 4<=t.length&&"projects"===t.get(0)&&"databases"===t.get(2)},nf.prototype.toValue=function(t){if(t instanceof Xa)return {nullValue:"NULL_VALUE"};if(t instanceof ts)return {booleanValue:t.value()};if(t instanceof ss)return {integerValue:""+t.value()};if(t instanceof hs){var e=t.value();if(this.options.useProto3Json){if(isNaN(e))return {doubleValue:"NaN"};if(e===1/0)return {doubleValue:"Infinity"};if(e===-1/0)return {doubleValue:"-Infinity"}}return {doubleValue:t.value()}}return t instanceof ps?{stringValue:t.value()}:t instanceof Ms?{mapValue:this.toMapValue(t)}:t instanceof Os?{arrayValue:this.toArrayValue(t)}:t instanceof ys?{timestampValue:this.toTimestamp(t.internalValue)}:t instanceof As?{geoPointValue:{latitude:t.value().latitude,longitude:t.value().longitude}}:t instanceof Ss?{bytesValue:this.toBytes(t.value())}:t instanceof Cs?{referenceValue:this.toResourceName(t.databaseId,t.key.path)}:Br("Unknown FieldValue "+JSON.stringify(t))},nf.prototype.fromValue=function(t){var e=this;if("nullValue"in t)return Xa.INSTANCE;if("booleanValue"in t)return ts.of(t.booleanValue);if("integerValue"in t)return new ss(tf(t.integerValue));if("doubleValue"in t){if(this.options.useProto3Json){if("NaN"===t.doubleValue)return hs.NAN;if("Infinity"===t.doubleValue)return hs.POSITIVE_INFINITY;if("-Infinity"===t.doubleValue)return hs.NEGATIVE_INFINITY}return new hs(t.doubleValue)}if("stringValue"in t)return new ps(t.stringValue);if("mapValue"in t)return this.fromFields(t.mapValue.fields||{});if("arrayValue"in t){$l(t.arrayValue,"arrayValue");var n=t.arrayValue.values||[];return new Os(n.map(function(t){return e.fromValue(t)}))}if("timestampValue"in t)return $l(t.timestampValue,"timestampValue"),new ys(this.fromTimestamp(t.timestampValue));if("geoPointValue"in t){$l(t.geoPointValue,"geoPointValue");var r=t.geoPointValue.latitude||0,i=t.geoPointValue.longitude||0;return new As(new Pl(r,i))}if("bytesValue"in t){$l(t.bytesValue,"bytesValue");var o=this.fromBlob(t.bytesValue);return new Ss(o)}if("referenceValue"in t){$l(t.referenceValue,"referenceValue");var a=this.fromResourceName(t.referenceValue),s=new _i(a.get(1),a.get(3)),u=new Gi(this.extractLocalPathFromResourceName(a));return new Cs(s,u)}return Br("Unknown Value proto "+JSON.stringify(t))},nf.prototype.toMutationDocument=function(t,e){return {name:this.toName(t),fields:this.toFields(e)}},nf.prototype.toDocument=function(t){return Ur(!t.hasLocalMutations,"Can't serialize documents with mutations."),{name:this.toName(t.key),fields:this.toFields(t.data()),updateTime:this.toTimestamp(t.version.toTimestamp())}},nf.prototype.fromDocument=function(t,e){var n=this,r=this.fromName(t.name),i=this.fromVersion(t.updateTime);return new Vs(r,i,{hasCommittedMutations:!!e},void 0,t,function(t){return n.fromValue(t)})},nf.prototype.toFields=function(t){var n=this,r={};return t.forEach(function(t,e){r[t]=n.toValue(e);}),r},nf.prototype.fromFields=function(t){var n=this,e=t,r=Ms.EMPTY;return $r(e,function(t,e){r=r.set(new Wi([t]),n.fromValue(e));}),r},nf.prototype.toMapValue=function(t){return {fields:this.toFields(t)}},nf.prototype.toArrayValue=function(t){var e=this,n=[];return t.forEach(function(t){n.push(e.toValue(t));}),{values:n}},nf.prototype.fromFound=function(t){var e=this;Ur(!!t.found,"Tried to deserialize a found document from a missing document."),$l(t.found.name,"doc.found.name"),$l(t.found.updateTime,"doc.found.updateTime");var n=this.fromName(t.found.name),r=this.fromVersion(t.found.updateTime);return new Vs(n,r,{},void 0,t.found,function(t){return e.fromValue(t)})},nf.prototype.fromMissing=function(t){Ur(!!t.missing,"Tried to deserialize a missing document from a found document."),Ur(!!t.readTime,"Tried to deserialize a missing document without a read time.");var e=this.fromName(t.missing),n=this.fromVersion(t.readTime);return new Ks(e,n)},nf.prototype.fromMaybeDocument=function(t){return "found"in t?this.fromFound(t):"missing"in t?this.fromMissing(t):Br("invalid batch get response: "+JSON.stringify(t))},nf.prototype.toWatchTargetChangeState=function(t){switch(t){case Tl.Added:return "ADD";case Tl.Current:return "CURRENT";case Tl.NoChange:return "NO_CHANGE";case Tl.Removed:return "REMOVE";case Tl.Reset:return "RESET";default:return Br("Unknown WatchTargetChangeState: "+t)}},nf.prototype.toTestWatchChange=function(t){if(t instanceof Il)return {filter:{count:t.existenceFilter.count,targetId:t.targetId}};if(t instanceof El){if(t.newDoc instanceof Vs){var e=t.newDoc;return {documentChange:{document:{name:this.toName(e.key),fields:this.toFields(e.data()),updateTime:this.toVersion(e.version)},targetIds:t.updatedTargetIds,removedTargetIds:t.removedTargetIds}}}if(t.newDoc instanceof Ks)return e=t.newDoc,{documentDelete:{document:this.toName(e.key),readTime:this.toVersion(e.version),removedTargetIds:t.removedTargetIds}};if(null===t.newDoc)return {documentRemove:{document:this.toName(t.key),removedTargetIds:t.removedTargetIds}}}if(t instanceof Cl){var n=void 0;return t.cause&&(n={code:function(t){if(void 0===t)return el.OK;switch(t){case Gr.OK:return el.OK;case Gr.CANCELLED:return el.CANCELLED;case Gr.UNKNOWN:return el.UNKNOWN;case Gr.DEADLINE_EXCEEDED:return el.DEADLINE_EXCEEDED;case Gr.RESOURCE_EXHAUSTED:return el.RESOURCE_EXHAUSTED;case Gr.INTERNAL:return el.INTERNAL;case Gr.UNAVAILABLE:return el.UNAVAILABLE;case Gr.UNAUTHENTICATED:return el.UNAUTHENTICATED;case Gr.INVALID_ARGUMENT:return el.INVALID_ARGUMENT;case Gr.NOT_FOUND:return el.NOT_FOUND;case Gr.ALREADY_EXISTS:return el.ALREADY_EXISTS;case Gr.PERMISSION_DENIED:return el.PERMISSION_DENIED;case Gr.FAILED_PRECONDITION:return el.FAILED_PRECONDITION;case Gr.ABORTED:return el.ABORTED;case Gr.OUT_OF_RANGE:return el.OUT_OF_RANGE;case Gr.UNIMPLEMENTED:return el.UNIMPLEMENTED;case Gr.DATA_LOSS:return el.DATA_LOSS;default:return Br("Unknown status code: "+t)}}(t.cause.code),message:t.cause.message}),{targetChange:{targetChangeType:this.toWatchTargetChangeState(t.state),targetIds:t.targetIds,resumeToken:this.unsafeCastProtoByteString(t.resumeToken),cause:n}}}return Br("Unrecognized watch change: "+JSON.stringify(t))},nf.prototype.fromWatchChange=function(t){var e,n=this;if("targetChange"in t){$l(t.targetChange,"targetChange");var r=this.fromWatchTargetChangeState(t.targetChange.targetChangeType||"NO_CHANGE"),i=t.targetChange.targetIds||[],o=t.targetChange.resumeToken||this.emptyByteString(),a=t.targetChange.cause,s=a&&this.fromRpcStatus(a);e=new Cl(r,i,o,s||null);}else if("documentChange"in t){$l(t.documentChange,"documentChange");var u=t.documentChange;$l(u.document,"documentChange.name"),$l(u.document.name,"documentChange.document.name"),$l(u.document.updateTime,"documentChange.document.updateTime");var c=this.fromName(u.document.name),h=this.fromVersion(u.document.updateTime),l=new Vs(c,h,{},void 0,u.document,function(t){return n.fromValue(t)}),f=u.targetIds||[],p=u.removedTargetIds||[];e=new El(f,p,l.key,l);}else if("documentDelete"in t){$l(t.documentDelete,"documentDelete");var d=t.documentDelete;$l(d.document,"documentDelete.document"),c=this.fromName(d.document),h=d.readTime?this.fromVersion(d.readTime):lo.forDeletedDoc(),l=new Ks(c,h),p=d.removedTargetIds||[],e=new El([],p,l.key,l);}else if("documentRemove"in t){$l(t.documentRemove,"documentRemove");var m=t.documentRemove;$l(m.document,"documentRemove"),c=this.fromName(m.document),p=m.removedTargetIds||[],e=new El([],p,c,null);}else{if(!("filter"in t))return Br("Unknown change type "+JSON.stringify(t));$l(t.filter,"filter");var y=t.filter;$l(y.targetId,"filter.targetId");var g=y.count||0,v=new Gl(g),b=y.targetId;e=new Il(b,v);}return e},nf.prototype.fromWatchTargetChangeState=function(t){return "NO_CHANGE"===t?Tl.NoChange:"ADD"===t?Tl.Added:"REMOVE"===t?Tl.Removed:"CURRENT"===t?Tl.Current:"RESET"===t?Tl.Reset:Br("Got unexpected TargetChange.state: "+t)},nf.prototype.versionFromListenResponse=function(t){if(!("targetChange"in t))return lo.MIN;var e=t.targetChange;return e.targetIds&&e.targetIds.length?lo.MIN:e.readTime?this.fromVersion(e.readTime):lo.MIN},nf.prototype.toMutation=function(t){var e,n=this;if(t instanceof Ma)e={update:this.toMutationDocument(t.key,t.value)};else if(t instanceof Wa)e={delete:this.toName(t.key)};else if(t instanceof Oa)e={update:this.toMutationDocument(t.key,t.data),updateMask:this.toDocumentMask(t.fieldMask)};else{if(!(t instanceof Fa))return Br("Unknown mutation type "+t.type);e={transform:{document:this.toName(t.key),fieldTransforms:t.fieldTransforms.map(function(t){return n.toFieldTransform(t)})}};}return t.precondition.isNone||(e.currentDocument=this.toPrecondition(t.precondition)),e},nf.prototype.fromMutation=function(t){var e=this,n=t.currentDocument?this.fromPrecondition(t.currentDocument):Da.NONE;if(t.update){$l(t.update.name,"name");var r=this.fromName(t.update.name),i=this.fromFields(t.update.fields||{});if(t.updateMask){var o=this.fromDocumentMask(t.updateMask);return new Oa(r,i,o,n)}return new Ma(r,i,n)}if(t.delete)return r=this.fromName(t.delete),new Wa(r,n);if(t.transform){r=this.fromName(t.transform.document);var a=t.transform.fieldTransforms.map(function(t){return e.fromFieldTransform(t)});return Ur(!0===n.exists,'Transforms only support precondition "exists == true"'),new Fa(r,a)}return Br("unknown mutation proto: "+JSON.stringify(t))},nf.prototype.toPrecondition=function(t){return Ur(!t.isNone,"Can't serialize an empty precondition"),void 0!==t.updateTime?{updateTime:this.toVersion(t.updateTime)}:void 0!==t.exists?{exists:t.exists}:Br("Unknown precondition")},nf.prototype.fromPrecondition=function(t){return void 0!==t.updateTime?Da.updateTime(this.fromVersion(t.updateTime)):void 0!==t.exists?Da.exists(t.exists):Da.NONE},nf.prototype.fromWriteResult=function(t,e){var n=this,r=t.updateTime?this.fromVersion(t.updateTime):this.fromVersion(e);r.isEqual(lo.MIN)&&(r=this.fromVersion(e));var i=null;return t.transformResults&&0<t.transformResults.length&&(i=t.transformResults.map(function(t){return n.fromValue(t)})),new Ca(r,i)},nf.prototype.fromWriteResults=function(t,e){var n=this;return t&&0<t.length?(Ur(void 0!==e,"Received a write result without a commit time"),t.map(function(t){return n.fromWriteResult(t,e)})):[]},nf.prototype.toFieldTransform=function(t){var e=this,n=t.transform;if(n instanceof Fl)return {fieldPath:t.field.canonicalString(),setToServerValue:"REQUEST_TIME"};if(n instanceof Vl)return {fieldPath:t.field.canonicalString(),appendMissingElements:{values:n.elements.map(function(t){return e.toValue(t)})}};if(n instanceof Ul)return {fieldPath:t.field.canonicalString(),removeAllFromArray:{values:n.elements.map(function(t){return e.toValue(t)})}};if(n instanceof Ql)return {fieldPath:t.field.canonicalString(),increment:this.toValue(n.operand)};throw Br("Unknown transform: "+t.transform)},nf.prototype.fromFieldTransform=function(t){var e=this,n=null;if("setToServerValue"in t)Ur("REQUEST_TIME"===t.setToServerValue,"Unknown server value transform proto: "+JSON.stringify(t)),n=Fl.instance;else if("appendMissingElements"in t){var r=t.appendMissingElements.values||[];n=new Vl(r.map(function(t){return e.fromValue(t)}));}else if("removeAllFromArray"in t)r=t.removeAllFromArray.values||[],n=new Ul(r.map(function(t){return e.fromValue(t)}));else if("increment"in t){var i=this.fromValue(t.increment);Ur(i instanceof rs,"NUMERIC_ADD transform requires a NumberValue"),n=new Ql(i);}else Br("Unknown transform proto: "+JSON.stringify(t));var o=Wi.fromServerFormat(t.fieldPath);return new Ta(o,n)},nf.prototype.toDocumentsTarget=function(t){return {documents:[this.toQueryPath(t.path)]}},nf.prototype.fromDocumentsTarget=function(t){var e=t.documents.length;Ur(1===e,"DocumentsTarget contained other than 1 document: "+e);var n=t.documents[0];return Rc.atPath(this.fromQueryPath(n)).toTarget()},nf.prototype.toQueryTarget=function(t){var e={structuredQuery:{}},n=t.path;null!==t.collectionGroup?(Ur(n.length%2==0,"Collection Group queries should be within a document path or root."),e.parent=this.toQueryPath(n),e.structuredQuery.from=[{collectionId:t.collectionGroup,allDescendants:!0}]):(Ur(n.length%2!=0,"Document queries with filters are not supported."),e.parent=this.toQueryPath(n.popLast()),e.structuredQuery.from=[{collectionId:n.lastSegment()}]);var r=this.toFilter(t.filters);r&&(e.structuredQuery.where=r);var i=this.toOrder(t.orderBy);i&&(e.structuredQuery.orderBy=i);var o=this.toInt32Value(t.limit);return null!==o&&(e.structuredQuery.limit=o),t.startAt&&(e.structuredQuery.startAt=this.toCursor(t.startAt)),t.endAt&&(e.structuredQuery.endAt=this.toCursor(t.endAt)),e},nf.prototype.fromQueryTarget=function(t){var e=this.fromQueryPath(t.parent),n=t.structuredQuery,r=n.from?n.from.length:0,i=null;if(0<r){Ur(1===r,"StructuredQuery.from with more than one collection is not supported.");var o=n.from[0];o.allDescendants?i=o.collectionId:e=e.child(o.collectionId);}var a=[];n.where&&(a=this.fromFilter(n.where));var s=[];n.orderBy&&(s=this.fromOrder(n.orderBy));var u=null;n.limit&&(u=this.fromInt32Value(n.limit));var c=null;n.startAt&&(c=this.fromCursor(n.startAt));var h=null;return n.endAt&&(h=this.fromCursor(n.endAt)),new Rc(e,i,s,a,u,Dc.First,c,h).toTarget()},nf.prototype.toListenRequestLabels=function(t){var e=this.toLabel(t.purpose);return null==e?null:{"goog-listen-tags":e}},nf.prototype.toLabel=function(t){switch(t){case qu.Listen:return null;case qu.ExistenceFilterMismatch:return "existence-filter-mismatch";case qu.LimboResolution:return "limbo-document";default:return Br("Unrecognized query purpose: "+t)}},nf.prototype.toTarget=function(t){var e,n=t.target;return (e=n.isDocumentQuery()?{documents:this.toDocumentsTarget(n)}:{query:this.toQueryTarget(n)}).targetId=t.targetId,0<t.resumeToken.length&&(e.resumeToken=this.unsafeCastProtoByteString(t.resumeToken)),e},nf.prototype.toFilter=function(t){var e=this;if(0!==t.length){var n=t.map(function(t){return t instanceof xc?e.toUnaryOrFieldFilter(t):Br("Unrecognized filter: "+JSON.stringify(t))});return 1===n.length?n[0]:{compositeFilter:{op:"AND",filters:n}}}},nf.prototype.fromFilter=function(t){var e=this;return t?void 0!==t.unaryFilter?[this.fromUnaryFilter(t)]:void 0!==t.fieldFilter?[this.fromFieldFilter(t)]:void 0!==t.compositeFilter?t.compositeFilter.filters.map(function(t){return e.fromFilter(t)}).reduce(function(t,e){return t.concat(e)}):Br("Unknown filter: "+JSON.stringify(t)):[]},nf.prototype.toOrder=function(t){var e=this;if(0!==t.length)return t.map(function(t){return e.toPropertyOrder(t)})},nf.prototype.fromOrder=function(t){var e=this;return t.map(function(t){return e.fromPropertyOrder(t)})},nf.prototype.toCursor=function(t){var e=this;return {before:t.before,values:t.position.map(function(t){return e.toValue(t)})}},nf.prototype.fromCursor=function(t){var e=this,n=!!t.before,r=t.values.map(function(t){return e.fromValue(t)});return new eh(r,n)},nf.prototype.toDirection=function(t){return Jl[t.name]},nf.prototype.fromDirection=function(t){switch(t){case"ASCENDING":return $c.ASCENDING;case"DESCENDING":return $c.DESCENDING;default:return}},nf.prototype.toOperatorName=function(t){return Xl[t.name]},nf.prototype.fromOperatorName=function(t){switch(t){case"EQUAL":return Lc.EQUAL;case"GREATER_THAN":return Lc.GREATER_THAN;case"GREATER_THAN_OR_EQUAL":return Lc.GREATER_THAN_OR_EQUAL;case"LESS_THAN":return Lc.LESS_THAN;case"LESS_THAN_OR_EQUAL":return Lc.LESS_THAN_OR_EQUAL;case"ARRAY_CONTAINS":return Lc.ARRAY_CONTAINS;case"IN":return Lc.IN;case"ARRAY_CONTAINS_ANY":return Lc.ARRAY_CONTAINS_ANY;case"OPERATOR_UNSPECIFIED":return Br("Unspecified operator");default:return Br("Unknown operator")}},nf.prototype.toFieldPathReference=function(t){return {fieldPath:t.canonicalString()}},nf.prototype.fromFieldPathReference=function(t){return Wi.fromServerFormat(t.fieldPath)},nf.prototype.toPropertyOrder=function(t){return {field:this.toFieldPathReference(t.field),direction:this.toDirection(t.dir)}},nf.prototype.fromPropertyOrder=function(t){return new rh(this.fromFieldPathReference(t.field),this.fromDirection(t.direction))},nf.prototype.fromFieldFilter=function(t){return xc.create(this.fromFieldPathReference(t.fieldFilter.field),this.fromOperatorName(t.fieldFilter.op),this.fromValue(t.fieldFilter.value))},nf.prototype.toUnaryOrFieldFilter=function(t){if(t.op===Lc.EQUAL){if(t.value.isEqual(hs.NAN))return {unaryFilter:{field:this.toFieldPathReference(t.field),op:"IS_NAN"}};if(t.value.isEqual(Xa.INSTANCE))return {unaryFilter:{field:this.toFieldPathReference(t.field),op:"IS_NULL"}}}return {fieldFilter:{field:this.toFieldPathReference(t.field),op:this.toOperatorName(t.op),value:this.toValue(t.value)}}},nf.prototype.fromUnaryFilter=function(t){switch(t.unaryFilter.op){case"IS_NAN":var e=this.fromFieldPathReference(t.unaryFilter.field);return xc.create(e,Lc.EQUAL,hs.NAN);case"IS_NULL":var n=this.fromFieldPathReference(t.unaryFilter.field);return xc.create(n,Lc.EQUAL,Xa.INSTANCE);case"OPERATOR_UNSPECIFIED":return Br("Unspecified filter");default:return Br("Unknown filter")}},nf.prototype.toDocumentMask=function(t){var e=[];return t.fields.forEach(function(t){return e.push(t.canonicalString())}),{fieldPaths:e}},nf.prototype.fromDocumentMask=function(t){var e=(t.fieldPaths||[]).map(function(t){return Wi.fromServerFormat(t)});return ba.fromArray(e)},nf);function nf(t,e){this.databaseId=t,this.options=e;}var rf=function(){this.viewSnap=null,this.targetId=0,this.listeners=[];},of=(af.prototype.listen=function(t){var e=t.query,n=!1,r=this.queries.get(e);return r||(n=!0,r=new rf,this.queries.set(e,r)),r.listeners.push(t),Ur(!t.applyOnlineStateChange(this.onlineState),"applyOnlineStateChange() shouldn't raise an event for brand-new listeners."),!r.viewSnap||t.onViewSnapshot(r.viewSnap)&&this.raiseSnapshotsInSyncEvent(),n?this.syncEngine.listen(e).then(function(t){return r.targetId=t}):Promise.resolve(r.targetId)},af.prototype.unlisten=function(o){return p(this,void 0,void 0,function(){var e,n,r,i;return m(this,function(t){return e=o.query,n=!1,(r=this.queries.get(e))&&0<=(i=r.listeners.indexOf(o))&&(r.listeners.splice(i,1),n=0===r.listeners.length),n?(this.queries.delete(e),[2,this.syncEngine.unlisten(e)]):[2]})})},af.prototype.onWatchChange=function(t){for(var e=!1,n=0,r=t;n<r.length;n++){var i=r[n],o=i.query,a=this.queries.get(o);if(a){for(var s=0,u=a.listeners;s<u.length;s++)u[s].onViewSnapshot(i)&&(e=!0);a.viewSnap=i;}}e&&this.raiseSnapshotsInSyncEvent();},af.prototype.onWatchError=function(t,e){var n=this.queries.get(t);if(n)for(var r=0,i=n.listeners;r<i.length;r++)i[r].onError(e);this.queries.delete(t);},af.prototype.onOnlineStateChange=function(i){this.onlineState=i;var o=!1;this.queries.forEach(function(t,e){for(var n=0,r=e.listeners;n<r.length;n++)r[n].applyOnlineStateChange(i)&&(o=!0);}),o&&this.raiseSnapshotsInSyncEvent();},af.prototype.addSnapshotsInSyncListener=function(t){this.snapshotsInSyncListeners.add(t),t.next();},af.prototype.removeSnapshotsInSyncListener=function(t){this.snapshotsInSyncListeners.delete(t);},af.prototype.raiseSnapshotsInSyncEvent=function(){this.snapshotsInSyncListeners.forEach(function(t){t.next();});},af);function af(t){this.syncEngine=t,this.queries=new zs(function(t){return t.canonicalId()}),this.onlineState=Yh.Unknown,this.snapshotsInSyncListeners=new Set,this.syncEngine.subscribe(this);}var sf=(uf.prototype.onViewSnapshot=function(t){if(Ur(0<t.docChanges.length||t.syncStateChanged,"We got a new snapshot with no changes?"),!this.options.includeMetadataChanges){for(var e=[],n=0,r=t.docChanges;n<r.length;n++){var i=r[n];i.type!==sl.Metadata&&e.push(i);}t=new ml(t.query,t.docs,t.oldDocs,e,t.mutatedKeys,t.fromCache,t.syncStateChanged,!0);}var o=!1;return this.raisedInitialEvent?this.shouldRaiseEvent(t)&&(this.queryObserver.next(t),o=!0):this.shouldRaiseInitialEvent(t,this.onlineState)&&(this.raiseInitialEvent(t),o=!0),this.snap=t,o},uf.prototype.onError=function(t){this.queryObserver.error(t);},uf.prototype.applyOnlineStateChange=function(t){this.onlineState=t;var e=!1;return this.snap&&!this.raisedInitialEvent&&this.shouldRaiseInitialEvent(this.snap,t)&&(this.raiseInitialEvent(this.snap),e=!0),e},uf.prototype.shouldRaiseInitialEvent=function(t,e){if(Ur(!this.raisedInitialEvent,"Determining whether to raise first event but already had first event"),!t.fromCache)return !0;var n=e!==Yh.Offline;return this.options.waitForSyncWhenOnline&&n?(Ur(t.fromCache,"Waiting for sync, but snapshot is not from cache"),!1):!t.docs.isEmpty()||e===Yh.Offline},uf.prototype.shouldRaiseEvent=function(t){if(0<t.docChanges.length)return !0;var e=this.snap&&this.snap.hasPendingWrites!==t.hasPendingWrites;return !(!t.syncStateChanged&&!e)&&!0===this.options.includeMetadataChanges},uf.prototype.raiseInitialEvent=function(t){Ur(!this.raisedInitialEvent,"Trying to raise initial events for second time"),t=ml.fromInitialDocuments(t.query,t.docs,t.mutatedKeys,t.fromCache),this.raisedInitialEvent=!0,this.queryObserver.next(t);},uf);function uf(t,e,n){this.query=t,this.queryObserver=e,this.raisedInitialEvent=!1,this.snap=null,this.onlineState=Yh.Unknown,this.options=n||{};}var cf=(hf.fromSnapshot=function(t,e){for(var n=Oo(),r=Oo(),i=0,o=e.docChanges;i<o.length;i++){var a=o[i];switch(a.type){case sl.Added:n=n.add(a.doc.key);break;case sl.Removed:r=r.add(a.doc.key);}}return new hf(t,e.fromCache,n,r)},hf);function hf(t,e,n,r){this.targetId=t,this.fromCache=e,this.addedKeys=n,this.removedKeys=r;}var lf=function(t){this.key=t;},ff=function(t){this.key=t;},pf=(Object.defineProperty(df.prototype,"syncedDocuments",{get:function(){return this._syncedDocuments},enumerable:!0,configurable:!0}),df.prototype.computeDocChanges=function(t,e){var s=this,u=e?e.changeSet:new pl,c=e?e.documentSet:this.documentSet,h=e?e.mutatedKeys:this.mutatedKeys,l=c,f=!1,p=this.query.hasLimitToFirst()&&c.size===this.query.limit?c.last():null,d=this.query.hasLimitToLast()&&c.size===this.query.limit?c.first():null;if(t.inorderTraversal(function(t,e){var n=c.get(t),r=e instanceof Vs?e:null;r&&(Ur(t.isEqual(r.key),"Mismatching keys found in document changes: "+t+" != "+r.key),r=s.query.matches(r)?r:null);var i=!!n&&s.mutatedKeys.has(n.key),o=!!r&&(r.hasLocalMutations||s.mutatedKeys.has(r.key)&&r.hasCommittedMutations),a=!1;n&&r?n.data().isEqual(r.data())?i!==o&&(u.track({type:sl.Metadata,doc:r}),a=!0):s.shouldWaitForSyncedDocument(n,r)||(u.track({type:sl.Modified,doc:r}),a=!0,(p&&0<s.query.docComparator(r,p)||d&&s.query.docComparator(r,d)<0)&&(f=!0)):!n&&r?(u.track({type:sl.Added,doc:r}),a=!0):n&&!r&&(u.track({type:sl.Removed,doc:n}),a=!0,(p||d)&&(f=!0)),a&&(h=r?(l=l.add(r),o?h.add(t):h.delete(t)):(l=l.delete(t),h.delete(t)));}),this.query.hasLimitToFirst()||this.query.hasLimitToLast())for(;l.size>this.query.limit;){var n=this.query.hasLimitToFirst()?l.last():l.first();l=l.delete(n.key),h=h.delete(n.key),u.track({type:sl.Removed,doc:n});}return Ur(!f||!e,"View was refilled using docs that themselves needed refilling."),{documentSet:l,changeSet:u,needsRefill:f,mutatedKeys:h}},df.prototype.shouldWaitForSyncedDocument=function(t,e){return t.hasLocalMutations&&e.hasCommittedMutations&&!e.hasLocalMutations},df.prototype.applyChanges=function(t,e,n){var r=this;Ur(!t.needsRefill,"Cannot apply changes that need a refill");var i=this.documentSet;this.documentSet=t.documentSet,this.mutatedKeys=t.mutatedKeys;var o=t.changeSet.getChanges();o.sort(function(t,e){return function(t,e){function n(t){switch(t){case sl.Added:return 1;case sl.Modified:case sl.Metadata:return 2;case sl.Removed:return 0;default:return Br("Unknown ChangeType: "+t)}}return n(t)-n(e)}(t.type,e.type)||r.query.docComparator(t.doc,e.doc)}),this.applyTargetChange(n);var a=e?this.updateLimboDocuments():[],s=0===this.limboDocuments.size&&this.current?cl.Synced:cl.Local,u=s!==this.syncState;return this.syncState=s,0!==o.length||u?{snapshot:new ml(this.query,t.documentSet,i,o,t.mutatedKeys,s===cl.Local,u,!1),limboChanges:a}:{limboChanges:a}},df.prototype.applyOnlineStateChange=function(t){return this.current&&t===Yh.Offline?(this.current=!1,this.applyChanges({documentSet:this.documentSet,changeSet:new pl,mutatedKeys:this.mutatedKeys,needsRefill:!1},!1)):{limboChanges:[]}},df.prototype.shouldBeInLimbo=function(t){return !this._syncedDocuments.has(t)&&!!this.documentSet.has(t)&&!this.documentSet.get(t).hasLocalMutations},df.prototype.applyTargetChange=function(t){var e=this;t&&(t.addedDocuments.forEach(function(t){return e._syncedDocuments=e._syncedDocuments.add(t)}),t.modifiedDocuments.forEach(function(t){return Ur(e._syncedDocuments.has(t),"Modified document "+t+" not found in view.")}),t.removedDocuments.forEach(function(t){return e._syncedDocuments=e._syncedDocuments.delete(t)}),this.current=t.current);},df.prototype.updateLimboDocuments=function(){var e=this;if(!this.current)return [];var n=this.limboDocuments;this.limboDocuments=Oo(),this.documentSet.forEach(function(t){e.shouldBeInLimbo(t.key)&&(e.limboDocuments=e.limboDocuments.add(t.key));});var r=[];return n.forEach(function(t){e.limboDocuments.has(t)||r.push(new ff(t));}),this.limboDocuments.forEach(function(t){n.has(t)||r.push(new lf(t));}),r},df.prototype.synchronizeWithPersistedState=function(t){this._syncedDocuments=t.remoteKeys,this.limboDocuments=Oo();var e=this.computeDocChanges(t.documents);return this.applyChanges(e,!0)},df.prototype.computeInitialSnapshot=function(){return ml.fromInitialDocuments(this.query,this.documentSet,this.mutatedKeys,this.syncState===cl.Local)},df);function df(t,e){this.query=t,this._syncedDocuments=e,this.syncState=null,this.current=!1,this.limboDocuments=Oo(),this.mutatedKeys=Oo(),this.documentSet=new ll(t.docComparator.bind(t));}var mf=(yf.prototype.run=function(){this.runWithBackOff();},yf.prototype.runWithBackOff=function(){var t=this;this.backoff.backoffAndRun(function(){return p(t,void 0,void 0,function(){var e,n,r=this;return m(this,function(t){return e=this.remoteStore.createTransaction(),(n=this.tryRunUpdateFunction(e))&&n.then(function(t){r.asyncQueue.enqueueAndForget(function(){return e.commit().then(function(){r.deferred.resolve(t);}).catch(function(t){r.handleTransactionError(t);})});}).catch(function(t){r.handleTransactionError(t);}),[2]})})});},yf.prototype.tryRunUpdateFunction=function(t){try{var e=this.updateFunction(t);return !Ic(e)&&e.catch&&e.then?e:(this.deferred.reject(Error("Transaction callback must return a Promise")),null)}catch(t){return this.deferred.reject(t),null}},yf.prototype.handleTransactionError=function(t){var e=this;0<this.retries&&this.isRetryableTransactionError(t)?(this.retries-=1,this.asyncQueue.enqueueAndForget(function(){return e.runWithBackOff(),Promise.resolve()})):this.deferred.reject(t);},yf.prototype.isRetryableTransactionError=function(t){if("FirebaseError"!==t.name)return !1;var e=t.code;return "aborted"===e||"failed-precondition"===e||!ol(e)},yf);function yf(t,e,n,r){this.asyncQueue=t,this.remoteStore=e,this.updateFunction=n,this.deferred=r,this.retries=5,this.backoff=new Oh(this.asyncQueue,Hi.RetryTransaction);}var gf="SyncEngine",vf=function(t,e,n){this.query=t,this.targetId=e,this.view=n;},bf=function(t){this.key=t,this.receivedDocument=!1;},wf=(Object.defineProperty(Tf.prototype,"isPrimaryClient",{get:function(){return !0===this.isPrimary},enumerable:!0,configurable:!0}),Tf.prototype.subscribe=function(t){Ur(null!==t,"SyncEngine listener cannot be null"),Ur(null===this.syncEngineListener,"SyncEngine already has a subscriber."),this.syncEngineListener=t;},Tf.prototype.listen=function(a){return p(this,void 0,void 0,function(){var e,n,r,i,o;return m(this,function(t){switch(t.label){case 0:return this.assertSubscribed("listen()"),(r=this.queryViewsByQuery.get(a))?(e=r.targetId,this.sharedClientState.addLocalQueryTarget(e),n=r.view.computeInitialSnapshot(),[3,4]):[3,1];case 1:return [4,this.localStore.allocateTarget(a.toTarget())];case 2:return i=t.sent(),o=this.sharedClientState.addLocalQueryTarget(i.targetId),e=i.targetId,[4,this.initializeViewAndComputeSnapshot(a,e,"current"===o)];case 3:n=t.sent(),this.isPrimary&&this.remoteStore.listen(i),t.label=4;case 4:return this.syncEngineListener.onWatchChange([n]),[2,e]}})})},Tf.prototype.initializeViewAndComputeSnapshot=function(s,u,c){return p(this,void 0,void 0,function(){var e,n,r,i,o,a;return m(this,function(t){switch(t.label){case 0:return [4,this.localStore.executeQuery(s,!0)];case 1:return e=t.sent(),n=new pf(s,e.remoteKeys),r=n.computeDocChanges(e.documents),i=bl.createSynthesizedTargetChangeForCurrentChange(u,c&&this.onlineState!==Yh.Offline),Ur(0===(o=n.applyChanges(r,!0===this.isPrimary,i)).limboChanges.length,"View returned limbo docs before target ack from the server."),Ur(!!o.snapshot,"applyChanges for new view should always return a snapshot"),a=new vf(s,u,n),this.queryViewsByQuery.set(s,a),this.queriesByTarget[u]||(this.queriesByTarget[u]=[]),this.queriesByTarget[u].push(s),[2,o.snapshot]}})})},Tf.prototype.synchronizeViewAndComputeSnapshot=function(r){return p(this,void 0,void 0,function(){var e,n;return m(this,function(t){switch(t.label){case 0:return [4,this.localStore.executeQuery(r.query,!0)];case 1:return e=t.sent(),n=r.view.synchronizeWithPersistedState(e),this.isPrimary&&this.updateTrackedLimbos(r.targetId,n.limboChanges),[2,n]}})})},Tf.prototype.unlisten=function(i){return p(this,void 0,void 0,function(){var e,n,r=this;return m(this,function(t){switch(t.label){case 0:return this.assertSubscribed("unlisten()"),Ur(!!(e=this.queryViewsByQuery.get(i)),"Trying to unlisten on query not found:"+i),1<(n=this.queriesByTarget[e.targetId]).length?(this.queriesByTarget[e.targetId]=n.filter(function(t){return !t.isEqual(i)}),this.queryViewsByQuery.delete(i),[2]):this.isPrimary?(this.sharedClientState.removeLocalQueryTarget(e.targetId),this.sharedClientState.isActiveQueryTarget(e.targetId)?[3,2]:[4,this.localStore.releaseTarget(e.targetId,!1).then(function(){r.sharedClientState.clearQueryState(e.targetId),r.remoteStore.unlisten(e.targetId),r.removeAndCleanupTarget(e.targetId);}).catch(dc)]):[3,3];case 1:t.sent(),t.label=2;case 2:return [3,5];case 3:return this.removeAndCleanupTarget(e.targetId),[4,this.localStore.releaseTarget(e.targetId,!0)];case 4:t.sent(),t.label=5;case 5:return [2]}})})},Tf.prototype.write=function(n,r){return p(this,void 0,void 0,function(){var e;return m(this,function(t){switch(t.label){case 0:return this.assertSubscribed("write()"),[4,this.localStore.localWrite(n)];case 1:return e=t.sent(),this.sharedClientState.addPendingMutation(e.batchId),this.addMutationCallback(e.batchId,r),[4,this.emitNewSnapsAndNotifyLocalStore(e.changes)];case 2:return t.sent(),[4,this.remoteStore.fillWritePipeline()];case 3:return t.sent(),[2]}})})},Tf.prototype.runTransaction=function(t,e,n){new mf(t,this.remoteStore,e,n).run();},Tf.prototype.applyRemoteEvent=function(n){return p(this,void 0,void 0,function(){var e,r=this;return m(this,function(t){switch(t.label){case 0:this.assertSubscribed("applyRemoteEvent()"),t.label=1;case 1:return t.trys.push([1,4,,6]),[4,this.localStore.applyRemoteEvent(n)];case 2:return e=t.sent(),$r(n.targetChanges,function(t,e){var n=r.limboResolutionsByTarget[Number(t)];n&&(Ur(e.addedDocuments.size+e.modifiedDocuments.size+e.removedDocuments.size<=1,"Limbo resolution for single document contains multiple changes."),0<e.addedDocuments.size?n.receivedDocument=!0:0<e.modifiedDocuments.size?Ur(n.receivedDocument,"Received change for limbo target document without add."):0<e.removedDocuments.size&&(Ur(n.receivedDocument,"Received remove for limbo target document without add."),n.receivedDocument=!1));}),[4,this.emitNewSnapsAndNotifyLocalStore(e,n)];case 3:return t.sent(),[3,6];case 4:return [4,dc(t.sent())];case 5:return t.sent(),[3,6];case 6:return [2]}})})},Tf.prototype.applyOnlineStateChange=function(r,t){if(this.isPrimary&&t===Xh.RemoteStore||!this.isPrimary&&t===Xh.SharedClientState){this.assertSubscribed("applyOnlineStateChange()");var i=[];this.queryViewsByQuery.forEach(function(t,e){var n=e.view.applyOnlineStateChange(r);Ur(0===n.limboChanges.length,"OnlineState should not affect limbo documents."),n.snapshot&&i.push(n.snapshot);}),this.syncEngineListener.onOnlineStateChange(r),this.syncEngineListener.onWatchChange(i),this.onlineState=r,this.isPrimary&&this.sharedClientState.setOnlineState(r);}},Tf.prototype.rejectListen=function(s,u){return p(this,void 0,void 0,function(){var e,n,r,i,o,a=this;return m(this,function(t){switch(t.label){case 0:return this.assertSubscribed("rejectListens()"),this.sharedClientState.updateQueryState(s,"rejected",u),e=this.limboResolutionsByTarget[s],(n=e&&e.key)?(this.limboTargetsByKey=this.limboTargetsByKey.remove(n),delete this.limboResolutionsByTarget[s],r=(r=new po(Gi.comparator)).insert(n,new Ks(n,lo.forDeletedDoc())),i=Oo().add(n),o=new gl(lo.MIN,{},new So(Si),r,i),[2,this.applyRemoteEvent(o)]):[3,1];case 1:return [4,this.localStore.releaseTarget(s,!1).then(function(){return a.removeAndCleanupTarget(s,u)}).catch(dc)];case 2:t.sent(),t.label=3;case 3:return [2]}})})},Tf.prototype.applyBatchState=function(n,r,i){return p(this,void 0,void 0,function(){var e;return m(this,function(t){switch(t.label){case 0:return this.assertSubscribed("applyBatchState()"),[4,this.localStore.lookupMutationDocuments(n)];case 1:return null===(e=t.sent())?(Fr(gf,"Cannot apply mutation batch with id: "+n),[2]):"pending"!==r?[3,3]:[4,this.remoteStore.fillWritePipeline()];case 2:return t.sent(),[3,4];case 3:"acknowledged"===r||"rejected"===r?(this.processUserCallback(n,i||null),this.localStore.removeCachedMutationBatchMetadata(n)):Br("Unknown batchState: "+r),t.label=4;case 4:return [4,this.emitNewSnapsAndNotifyLocalStore(e)];case 5:return t.sent(),[2]}})})},Tf.prototype.applySuccessfulWrite=function(r){return p(this,void 0,void 0,function(){var e,n;return m(this,function(t){switch(t.label){case 0:this.assertSubscribed("applySuccessfulWrite()"),e=r.batch.batchId,this.processUserCallback(e,null),this.triggerPendingWritesCallbacks(e),t.label=1;case 1:return t.trys.push([1,4,,6]),[4,this.localStore.acknowledgeBatch(r)];case 2:return n=t.sent(),this.sharedClientState.updateMutationState(e,"acknowledged"),[4,this.emitNewSnapsAndNotifyLocalStore(n)];case 3:return t.sent(),[3,6];case 4:return [4,dc(t.sent())];case 5:return t.sent(),[3,6];case 6:return [2]}})})},Tf.prototype.rejectFailedWrite=function(n,r){return p(this,void 0,void 0,function(){var e;return m(this,function(t){switch(t.label){case 0:this.assertSubscribed("rejectFailedWrite()"),this.processUserCallback(n,r),this.triggerPendingWritesCallbacks(n),t.label=1;case 1:return t.trys.push([1,4,,6]),[4,this.localStore.rejectBatch(n)];case 2:return e=t.sent(),this.sharedClientState.updateMutationState(n,"rejected",r),[4,this.emitNewSnapsAndNotifyLocalStore(e)];case 3:return t.sent(),[3,6];case 4:return [4,dc(t.sent())];case 5:return t.sent(),[3,6];case 6:return [2]}})})},Tf.prototype.registerPendingWritesCallback=function(r){return p(this,void 0,void 0,function(){var e,n;return m(this,function(t){switch(t.label){case 0:return this.remoteStore.canUseNetwork()||Fr(gf,"The network is disabled. The task returned by 'awaitPendingWrites()' will not complete until the network is enabled."),[4,this.localStore.getHighestUnacknowledgedBatchId()];case 1:return -1===(e=t.sent())?r.resolve():((n=this.pendingWritesCallbacks.get(e)||[]).push(r),this.pendingWritesCallbacks.set(e,n)),[2]}})})},Tf.prototype.triggerPendingWritesCallbacks=function(t){(this.pendingWritesCallbacks.get(t)||[]).forEach(function(t){t.resolve();}),this.pendingWritesCallbacks.delete(t);},Tf.prototype.rejectOutstandingPendingWritesCallbacks=function(e){this.pendingWritesCallbacks.forEach(function(t){t.forEach(function(t){t.reject(new zr(Gr.CANCELLED,e));});}),this.pendingWritesCallbacks.clear();},Tf.prototype.addMutationCallback=function(t,e){var n=this.mutationUserCallbacks[this.currentUser.toKey()];n=(n=n||new po(Si)).insert(t,e),this.mutationUserCallbacks[this.currentUser.toKey()]=n;},Tf.prototype.processUserCallback=function(t,e){var n=this.mutationUserCallbacks[this.currentUser.toKey()];if(n){var r=n.get(t);r&&(Ur(t===n.minKey(),"Mutation callbacks processed out-of-order?"),e?r.reject(e):r.resolve(),n=n.remove(t)),this.mutationUserCallbacks[this.currentUser.toKey()]=n;}},Tf.prototype.removeAndCleanupTarget=function(t,e){var n=this;void 0===e&&(e=null),this.sharedClientState.removeLocalQueryTarget(t),Ur(this.queriesByTarget[t]&&0!==this.queriesByTarget[t].length,"There are no queries mapped to target id "+t);for(var r=0,i=this.queriesByTarget[t];r<i.length;r++){var o=i[r];this.queryViewsByQuery.delete(o),e&&this.syncEngineListener.onWatchError(o,e);}if(delete this.queriesByTarget[t],this.isPrimary){var a=this.limboDocumentRefs.referencesForId(t);this.limboDocumentRefs.removeReferencesForId(t),a.forEach(function(t){n.limboDocumentRefs.containsKey(t)||n.removeLimboTarget(t);});}},Tf.prototype.removeLimboTarget=function(t){var e=this.limboTargetsByKey.get(t);null!==e&&(this.remoteStore.unlisten(e),this.limboTargetsByKey=this.limboTargetsByKey.remove(t),delete this.limboResolutionsByTarget[e]);},Tf.prototype.updateTrackedLimbos=function(t,e){for(var n=0,r=e;n<r.length;n++){var i=r[n];i instanceof lf?(this.limboDocumentRefs.addReference(i.key,t),this.trackLimboChange(i)):i instanceof ff?(Fr(gf,"Document no longer in limbo: "+i.key),this.limboDocumentRefs.removeReference(i.key,t),this.limboDocumentRefs.containsKey(i.key)||this.removeLimboTarget(i.key)):Br("Unknown limbo change: "+JSON.stringify(i));}},Tf.prototype.trackLimboChange=function(t){var e=t.key;if(!this.limboTargetsByKey.get(e)){Fr(gf,"New document in limbo: "+e);var n=this.limboTargetIdGenerator.next(),r=Rc.atPath(e.path);this.limboResolutionsByTarget[n]=new bf(e),this.remoteStore.listen(new Wu(r.toTarget(),n,qu.LimboResolution,Oi.INVALID)),this.limboTargetsByKey=this.limboTargetsByKey.insert(e,n);}},Tf.prototype.currentLimboDocs=function(){return this.limboTargetsByKey},Tf.prototype.emitNewSnapsAndNotifyLocalStore=function(r,u){return p(this,void 0,void 0,function(){var o,a,e,s=this;return m(this,function(t){switch(t.label){case 0:return o=[],a=[],e=[],this.queryViewsByQuery.forEach(function(t,i){e.push(Promise.resolve().then(function(){var n=i.view.computeDocChanges(r);return n.needsRefill?s.localStore.executeQuery(i.query,!1).then(function(t){var e=t.documents;return i.view.computeDocChanges(e,n)}):n}).then(function(t){var e=u&&u.targetChanges[i.targetId],n=i.view.applyChanges(t,!0===s.isPrimary,e);if(s.updateTrackedLimbos(i.targetId,n.limboChanges),n.snapshot){s.isPrimary&&s.sharedClientState.updateQueryState(i.targetId,n.snapshot.fromCache?"not-current":"current"),o.push(n.snapshot);var r=cf.fromSnapshot(i.targetId,n.snapshot);a.push(r);}}));}),[4,Promise.all(e)];case 1:return t.sent(),this.syncEngineListener.onWatchChange(o),[4,this.localStore.notifyLocalViewChanges(a)];case 2:return t.sent(),[2]}})})},Tf.prototype.assertSubscribed=function(t){Ur(null!==this.syncEngineListener,"Trying to call "+t+" before calling subscribe().");},Tf.prototype.handleCredentialChange=function(r){return p(this,void 0,void 0,function(){var e,n;return m(this,function(t){switch(t.label){case 0:return e=!this.currentUser.isEqual(r),this.currentUser=r,e?(this.rejectOutstandingPendingWritesCallbacks("'waitForPendingWrites' promise is rejected due to a user change."),[4,this.localStore.handleUserChange(r)]):[3,3];case 1:return n=t.sent(),this.sharedClientState.handleUserChange(r,n.removedBatchIds,n.addedBatchIds),[4,this.emitNewSnapsAndNotifyLocalStore(n.affectedDocuments)];case 2:t.sent(),t.label=3;case 3:return [4,this.remoteStore.handleCredentialChange()];case 4:return t.sent(),[2]}})})},Tf.prototype.applyPrimaryState=function(c){return p(this,void 0,void 0,function(){var e,n,r,i,o,a,s,u=this;return m(this,function(t){switch(t.label){case 0:return !0!==c||!0===this.isPrimary?[3,3]:(this.isPrimary=!0,[4,this.remoteStore.applyPrimaryState(!0)]);case 1:return t.sent(),e=this.sharedClientState.getAllActiveQueryTargets(),[4,this.synchronizeQueryViewsAndRaiseSnapshots(e.toArray())];case 2:for(n=t.sent(),r=0,i=n;r<i.length;r++)o=i[r],this.remoteStore.listen(o);return [3,7];case 3:return !1!==c||!1===this.isPrimary?[3,7]:(this.isPrimary=!1,a=[],s=Promise.resolve(),Zr(this.queriesByTarget,function(t,e){u.sharedClientState.isLocalQueryTarget(t)?a.push(t):s=s.then(function(){return u.removeAndCleanupTarget(t),u.localStore.releaseTarget(t,!0)}),u.remoteStore.unlisten(t);}),[4,s]);case 4:return t.sent(),[4,this.synchronizeQueryViewsAndRaiseSnapshots(a)];case 5:return t.sent(),this.resetLimboDocuments(),[4,this.remoteStore.applyPrimaryState(!1)];case 6:t.sent(),t.label=7;case 7:return [2]}})})},Tf.prototype.resetLimboDocuments=function(){var e=this;Zr(this.limboResolutionsByTarget,function(t){e.remoteStore.unlisten(t);}),this.limboDocumentRefs.removeAllReferences(),this.limboResolutionsByTarget=[],this.limboTargetsByKey=new po(Gi.comparator);},Tf.prototype.synchronizeQueryViewsAndRaiseSnapshots=function(d){return p(this,void 0,void 0,function(){var e,n,r,i,o,a,s,u,c,h,l,f,p;return m(this,function(t){switch(t.label){case 0:e=[],n=[],r=0,i=d,t.label=1;case 1:return r<i.length?(o=i[r],a=void 0,(s=this.queriesByTarget[o])&&0!==s.length?[4,this.localStore.releaseTarget(o,!0)]:[3,8]):[3,14];case 2:return t.sent(),[4,this.localStore.allocateTarget(s[0].toTarget())];case 3:a=t.sent(),u=0,c=s,t.label=4;case 4:return u<c.length?(h=c[u],Ur(!!(l=this.queryViewsByQuery.get(h)),"No query view found for "+h),[4,this.synchronizeViewAndComputeSnapshot(l)]):[3,7];case 5:(f=t.sent()).snapshot&&n.push(f.snapshot),t.label=6;case 6:return u++,[3,4];case 7:return [3,12];case 8:return Ur(!0===this.isPrimary,"A secondary tab should never have an active target without an active query."),[4,this.localStore.getTarget(o)];case 9:return Ur(!!(p=t.sent()),"Target for id "+o+" not found"),[4,this.localStore.allocateTarget(p)];case 10:return a=t.sent(),[4,this.initializeViewAndComputeSnapshot(this.synthesizeTargetToQuery(p),o,!1)];case 11:t.sent(),t.label=12;case 12:e.push(a),t.label=13;case 13:return r++,[3,1];case 14:return this.syncEngineListener.onWatchChange(n),[2,e]}})})},Tf.prototype.synthesizeTargetToQuery=function(t){return new Rc(t.path,t.collectionGroup,t.orderBy,t.filters,t.limit,Dc.First,t.startAt,t.endAt)},Tf.prototype.getActiveClients=function(){return this.localStore.getActiveClients()},Tf.prototype.applyTargetState=function(r,i,o){return p(this,void 0,void 0,function(){var e,n;return m(this,function(t){switch(t.label){case 0:if(this.isPrimary)return Fr(gf,"Ignoring unexpected query state notification."),[2];if(!this.queriesByTarget[r])return [3,7];switch(i){case"current":case"not-current":return [3,1];case"rejected":return [3,4]}return [3,6];case 1:return [4,this.localStore.getNewDocumentChanges()];case 2:return e=t.sent(),n=gl.createSynthesizedRemoteEventForCurrentChange(r,"current"===i),[4,this.emitNewSnapsAndNotifyLocalStore(e,n)];case 3:return t.sent(),[3,7];case 4:return [4,this.localStore.releaseTarget(r,!0)];case 5:return t.sent(),this.removeAndCleanupTarget(r,o),[3,7];case 6:Br("Unexpected target state: "+i),t.label=7;case 7:return [2]}})})},Tf.prototype.applyActiveTargetsChange=function(l,f){return p(this,void 0,void 0,function(){var e,n,r,i,o,a,s,u,c,h=this;return m(this,function(t){switch(t.label){case 0:if(!this.isPrimary)return [2];e=0,n=l,t.label=1;case 1:return e<n.length?(c=n[e],Ur(!this.queriesByTarget[c],"Trying to add an already active target"),[4,this.localStore.getTarget(c)]):[3,6];case 2:return Ur(!!(r=t.sent()),"Query data for active target "+c+" not found"),[4,this.localStore.allocateTarget(r)];case 3:return i=t.sent(),[4,this.initializeViewAndComputeSnapshot(this.synthesizeTargetToQuery(r),i.targetId,!1)];case 4:t.sent(),this.remoteStore.listen(i),t.label=5;case 5:return e++,[3,1];case 6:o=function(e){return m(this,function(t){switch(t.label){case 0:return a.queriesByTarget[e]?[4,a.localStore.releaseTarget(e,!1).then(function(){h.remoteStore.unlisten(e),h.removeAndCleanupTarget(e);}).catch(dc)]:[2,"continue"];case 1:return t.sent(),[2]}})},a=this,s=0,u=f,t.label=7;case 7:return s<u.length?(c=u[s],[5,o(c)]):[3,10];case 8:t.sent(),t.label=9;case 9:return s++,[3,7];case 10:return [2]}})})},Tf.prototype.enableNetwork=function(){return this.localStore.setNetworkEnabled(!0),this.remoteStore.enableNetwork()},Tf.prototype.disableNetwork=function(){return this.localStore.setNetworkEnabled(!1),this.remoteStore.disableNetwork()},Tf.prototype.getRemoteKeysForTarget=function(t){var e=this.limboResolutionsByTarget[t];if(e&&e.receivedDocument)return Oo().add(e.key);var n=Oo(),r=this.queriesByTarget[t];if(!r)return n;for(var i=0,o=r;i<o.length;i++){var a=o[i],s=this.queryViewsByQuery.get(a);Ur(!!s,"No query view found for "+a),n=n.unionWith(s.view.syncedDocuments);}return n},Tf);function Tf(t,e,n,r){this.localStore=t,this.remoteStore=e,this.sharedClientState=n,this.currentUser=r,this.syncEngineListener=null,this.queryViewsByQuery=new zs(function(t){return t.canonicalId()}),this.queriesByTarget={},this.limboTargetsByKey=new po(Gi.comparator),this.limboResolutionsByTarget={},this.limboDocumentRefs=new lh,this.mutationUserCallbacks={},this.pendingWritesCallbacks=new Map,this.limboTargetIdGenerator=la.forSyncEngine(),this.isPrimary=void 0,this.onlineState=Yh.Unknown;}var Sf=(Ef.prototype.isAuthenticated=function(){return null!=this.uid},Ef.prototype.toKey=function(){return this.isAuthenticated()?"uid:"+this.uid:"anonymous-user"},Ef.prototype.isEqual=function(t){return t.uid===this.uid},Ef.UNAUTHENTICATED=new Ef(null),Ef.GOOGLE_CREDENTIALS=new Ef("google-credentials-uid"),Ef.FIRST_PARTY=new Ef("first-party-uid"),Ef);function Ef(t){this.uid=t;}var If="SharedClientState",Cf="firestore_clients",Df="firestore_mutations",Nf="firestore_targets",Af=(kf.fromWebStorageEntry=function(t,e,n){var r=JSON.parse(n),i="object"==typeof r&&-1!==["pending","acknowledged","rejected"].indexOf(r.state)&&(void 0===r.error||"object"==typeof r.error),o=void 0;return i&&r.error&&(i="string"==typeof r.error.message&&"string"==typeof r.error.code)&&(o=new zr(r.error.code,r.error.message)),i?new kf(t,e,r.state,o):(qr(If,"Failed to parse mutation state for ID '"+e+"': "+n),null)},kf.prototype.toWebStorageJSON=function(){var t={state:this.state,updateTimeMs:Date.now()};return this.error&&(t.error={code:this.error.code,message:this.error.message}),JSON.stringify(t)},kf);function kf(t,e,n,r){this.user=t,this.batchId=e,this.state=n,Ur(void 0!==(this.error=r)==("rejected"===n),"MutationMetadata must contain an error iff state is 'rejected'");}var Rf=(Mf.fromWebStorageEntry=function(t,e){var n=JSON.parse(e),r="object"==typeof n&&-1!==["not-current","current","rejected"].indexOf(n.state)&&(void 0===n.error||"object"==typeof n.error),i=void 0;return r&&n.error&&(r="string"==typeof n.error.message&&"string"==typeof n.error.code)&&(i=new zr(n.error.code,n.error.message)),r?new Mf(t,n.state,i):(qr(If,"Failed to parse target state for ID '"+t+"': "+e),null)},Mf.prototype.toWebStorageJSON=function(){var t={state:this.state,updateTimeMs:Date.now()};return this.error&&(t.error={code:this.error.code,message:this.error.message}),JSON.stringify(t)},Mf);function Mf(t,e,n){this.targetId=t,this.state=e,Ur(void 0!==(this.error=n)==("rejected"===e),"QueryTargetMetadata must contain an error iff state is 'rejected'");}var _f=(Lf.fromWebStorageEntry=function(t,e){for(var n=JSON.parse(e),r="object"==typeof n&&n.activeTargetIds instanceof Array,i=xo(),o=0;r&&o<n.activeTargetIds.length;++o)r=Cc(n.activeTargetIds[o]),i=i.add(n.activeTargetIds[o]);return r?new Lf(t,i):(qr(If,"Failed to parse client data for instance '"+t+"': "+e),null)},Lf);function Lf(t,e){this.clientId=t,this.activeTargetIds=e;}var Of=(Pf.fromWebStorageEntry=function(t){var e=JSON.parse(t);return "object"==typeof e&&e.onlineState in Yh&&"string"==typeof e.clientId?new Pf(e.clientId,Yh[e.onlineState]):(qr(If,"Failed to parse online state: "+t),null)},Pf);function Pf(t,e){this.clientId=t,this.onlineState=e;}var xf=(Ff.prototype.addQueryTarget=function(t){this.activeTargetIds=this.activeTargetIds.add(t);},Ff.prototype.removeQueryTarget=function(t){this.activeTargetIds=this.activeTargetIds.delete(t);},Ff.prototype.toWebStorageJSON=function(){var t={activeTargetIds:this.activeTargetIds.toArray(),updateTimeMs:Date.now()};return JSON.stringify(t)},Ff);function Ff(){this.activeTargetIds=xo();}var qf=(Vf.isAvailable=function(t){return !(!t.window||null==t.window.localStorage)},Vf.prototype.start=function(){return p(this,void 0,void 0,function(){var e,n,r,i,o,a,s,u,c,h,l,f=this;return m(this,function(t){switch(t.label){case 0:return Ur(!this.started,"WebStorageSharedClientState already started"),Ur(null!==this.syncEngine,"syncEngine property must be set before calling start()"),Ur(null!==this.onlineStateHandler,"onlineStateHandler property must be set before calling start()"),[4,this.syncEngine.getActiveClients()];case 1:for(e=t.sent(),n=0,r=e;n<r.length;n++)(i=r[n])!==this.localClientId&&(o=this.getItem(this.toWebStorageClientStateKey(i)))&&(a=_f.fromWebStorageEntry(i,o))&&(this.activeClients[a.clientId]=a);for(this.persistClientState(),(s=this.storage.getItem(this.onlineStateKey))&&(u=this.fromWebStorageOnlineState(s))&&this.handleOnlineStateEvent(u),c=0,h=this.earlyEvents;c<h.length;c++)l=h[c],this.handleWebStorageEvent(l);return this.earlyEvents=[],this.platform.window.addEventListener("unload",function(){return f.shutdown()}),this.started=!0,[2]}})})},Vf.prototype.writeSequenceNumber=function(t){this.setItem(this.sequenceNumberKey,JSON.stringify(t));},Vf.prototype.getAllActiveQueryTargets=function(){var n=xo();return $r(this.activeClients,function(t,e){n=n.unionWith(e.activeTargetIds);}),n},Vf.prototype.isActiveQueryTarget=function(t){for(var e in this.activeClients)if(this.activeClients.hasOwnProperty(e)&&this.activeClients[e].activeTargetIds.has(t))return !0;return !1},Vf.prototype.addPendingMutation=function(t){this.persistMutationState(t,"pending");},Vf.prototype.updateMutationState=function(t,e,n){this.persistMutationState(t,e,n),this.removeMutationState(t);},Vf.prototype.addLocalQueryTarget=function(t){var e="not-current";if(this.isActiveQueryTarget(t)){var n=this.storage.getItem(this.toWebStorageQueryTargetMetadataKey(t));if(n){var r=Rf.fromWebStorageEntry(t,n);r&&(e=r.state);}}return this.localClientState.addQueryTarget(t),this.persistClientState(),e},Vf.prototype.removeLocalQueryTarget=function(t){this.localClientState.removeQueryTarget(t),this.persistClientState();},Vf.prototype.isLocalQueryTarget=function(t){return this.localClientState.activeTargetIds.has(t)},Vf.prototype.clearQueryState=function(t){this.removeItem(this.toWebStorageQueryTargetMetadataKey(t));},Vf.prototype.updateQueryState=function(t,e,n){this.persistQueryTargetState(t,e,n);},Vf.prototype.handleUserChange=function(t,e,n){var r=this;e.forEach(function(t){r.removeMutationState(t);}),this.currentUser=t,n.forEach(function(t){r.addPendingMutation(t);});},Vf.prototype.setOnlineState=function(t){this.persistOnlineState(t);},Vf.prototype.shutdown=function(){this.started&&(this.platform.window.removeEventListener("storage",this.storageListener),this.removeItem(this.localClientStorageKey),this.started=!1);},Vf.prototype.getItem=function(t){var e=this.storage.getItem(t);return Fr(If,"READ",t,e),e},Vf.prototype.setItem=function(t,e){Fr(If,"SET",t,e),this.storage.setItem(t,e);},Vf.prototype.removeItem=function(t){Fr(If,"REMOVE",t),this.storage.removeItem(t);},Vf.prototype.handleWebStorageEvent=function(s){var t=this;if(s.storageArea===this.storage){if(Fr(If,"EVENT",s.key,s.newValue),s.key===this.localClientStorageKey)return void qr("Received WebStorage notification for local change. Another client might have garbage-collected our state");this.queue.enqueueAndForget(function(){return p(t,void 0,void 0,function(){var e,n,r,i,o,a;return m(this,function(t){if(!this.started)return this.earlyEvents.push(s),[2];if(null===s.key)return [2];if(this.clientStateKeyRe.test(s.key)){if(null==s.newValue)return n=this.fromWebStorageClientStateKey(s.key),[2,this.handleClientStateEvent(n,null)];if(e=this.fromWebStorageClientState(s.key,s.newValue))return [2,this.handleClientStateEvent(e.clientId,e)]}else if(this.mutationBatchKeyRe.test(s.key)){if(null!==s.newValue&&(r=this.fromWebStorageMutationMetadata(s.key,s.newValue)))return [2,this.handleMutationBatchEvent(r)]}else if(this.queryTargetKeyRe.test(s.key)){if(null!==s.newValue&&(i=this.fromWebStorageQueryTargetMetadata(s.key,s.newValue)))return [2,this.handleQueryTargetEvent(i)]}else if(s.key===this.onlineStateKey){if(null!==s.newValue&&(o=this.fromWebStorageOnlineState(s.newValue)))return [2,this.handleOnlineStateEvent(o)]}else s.key===this.sequenceNumberKey&&(Ur(!!this.sequenceNumberHandler,"Missing sequenceNumberHandler"),(a=function(t){var e=Oi.INVALID;if(null!=t)try{var n=JSON.parse(t);Ur("number"==typeof n,"Found non-numeric sequence number"),e=n;}catch(t){qr(If,"Failed to read sequence number from WebStorage",t);}return e}(s.newValue))!==Oi.INVALID&&this.sequenceNumberHandler(a));return [2]})})});}},Object.defineProperty(Vf.prototype,"localClientState",{get:function(){return this.activeClients[this.localClientId]},enumerable:!0,configurable:!0}),Vf.prototype.persistClientState=function(){this.setItem(this.localClientStorageKey,this.localClientState.toWebStorageJSON());},Vf.prototype.persistMutationState=function(t,e,n){var r=new Af(this.currentUser,t,e,n),i=this.toWebStorageMutationBatchKey(t);this.setItem(i,r.toWebStorageJSON());},Vf.prototype.removeMutationState=function(t){var e=this.toWebStorageMutationBatchKey(t);this.removeItem(e);},Vf.prototype.persistOnlineState=function(t){var e={clientId:this.localClientId,onlineState:Yh[t]};this.storage.setItem(this.onlineStateKey,JSON.stringify(e));},Vf.prototype.persistQueryTargetState=function(t,e,n){var r=this.toWebStorageQueryTargetMetadataKey(t),i=new Rf(t,e,n);this.setItem(r,i.toWebStorageJSON());},Vf.prototype.toWebStorageClientStateKey=function(t){return Ur(-1===t.indexOf("_"),"Client key cannot contain '_', but was '"+t+"'"),Cf+"_"+this.persistenceKey+"_"+t},Vf.prototype.toWebStorageQueryTargetMetadataKey=function(t){return Nf+"_"+this.persistenceKey+"_"+t},Vf.prototype.toWebStorageMutationBatchKey=function(t){var e=Df+"_"+this.persistenceKey+"_"+t;return this.currentUser.isAuthenticated()&&(e+="_"+this.currentUser.uid),e},Vf.prototype.fromWebStorageClientStateKey=function(t){var e=this.clientStateKeyRe.exec(t);return e?e[1]:null},Vf.prototype.fromWebStorageClientState=function(t,e){var n=this.fromWebStorageClientStateKey(t);return Ur(null!==n,"Cannot parse client state key '"+t+"'"),_f.fromWebStorageEntry(n,e)},Vf.prototype.fromWebStorageMutationMetadata=function(t,e){var n=this.mutationBatchKeyRe.exec(t);Ur(null!==n,"Cannot parse mutation batch key '"+t+"'");var r=Number(n[1]),i=void 0!==n[2]?n[2]:null;return Af.fromWebStorageEntry(new Sf(i),r,e)},Vf.prototype.fromWebStorageQueryTargetMetadata=function(t,e){var n=this.queryTargetKeyRe.exec(t);Ur(null!==n,"Cannot parse query target key '"+t+"'");var r=Number(n[1]);return Rf.fromWebStorageEntry(r,e)},Vf.prototype.fromWebStorageOnlineState=function(t){return Of.fromWebStorageEntry(t)},Vf.prototype.handleMutationBatchEvent=function(e){return p(this,void 0,void 0,function(){return m(this,function(t){return e.user.uid!==this.currentUser.uid?(Fr(If,"Ignoring mutation for non-active user "+e.user.uid),[2]):[2,this.syncEngine.applyBatchState(e.batchId,e.state,e.error)]})})},Vf.prototype.handleQueryTargetEvent=function(t){return this.syncEngine.applyTargetState(t.targetId,t.state,t.error)},Vf.prototype.handleClientStateEvent=function(t,e){var n=this,r=this.getAllActiveQueryTargets();e?this.activeClients[t]=e:delete this.activeClients[t];var i=this.getAllActiveQueryTargets(),o=[],a=[];return i.forEach(function(e){return p(n,void 0,void 0,function(){return m(this,function(t){return r.has(e)||o.push(e),[2]})})}),r.forEach(function(e){return p(n,void 0,void 0,function(){return m(this,function(t){return i.has(e)||a.push(e),[2]})})}),this.syncEngine.applyActiveTargetsChange(o,a)},Vf.prototype.handleOnlineStateEvent=function(t){this.activeClients[t.clientId]&&this.onlineStateHandler(t.onlineState);},Vf);function Vf(t,e,n,r,i){if(this.queue=t,this.platform=e,this.persistenceKey=n,this.localClientId=r,this.syncEngine=null,this.onlineStateHandler=null,this.sequenceNumberHandler=null,this.activeClients={},this.storageListener=this.handleWebStorageEvent.bind(this),this.started=!1,this.earlyEvents=[],!Vf.isAvailable(this.platform))throw new zr(Gr.UNIMPLEMENTED,"LocalStorage is not available on this platform.");var o=n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");this.storage=this.platform.window.localStorage,this.currentUser=i,this.localClientStorageKey=this.toWebStorageClientStateKey(this.localClientId),this.sequenceNumberKey="firestore_sequence_number_"+n,this.activeClients[this.localClientId]=new xf,this.clientStateKeyRe=new RegExp("^"+Cf+"_"+o+"_([^_]*)$"),this.mutationBatchKeyRe=new RegExp("^"+Df+"_"+o+"_(\\d+)(?:_(.*))?$"),this.queryTargetKeyRe=new RegExp("^"+Nf+"_"+o+"_(\\d+)$"),this.onlineStateKey="firestore_online_state_"+n,this.platform.window.addEventListener("storage",this.storageListener);}var Bf=(Uf.prototype.addPendingMutation=function(t){},Uf.prototype.updateMutationState=function(t,e,n){},Uf.prototype.addLocalQueryTarget=function(t){return this.localState.addQueryTarget(t),this.queryState[t]||"not-current"},Uf.prototype.updateQueryState=function(t,e,n){this.queryState[t]=e;},Uf.prototype.removeLocalQueryTarget=function(t){this.localState.removeQueryTarget(t);},Uf.prototype.isLocalQueryTarget=function(t){return this.localState.activeTargetIds.has(t)},Uf.prototype.clearQueryState=function(t){delete this.queryState[t];},Uf.prototype.getAllActiveQueryTargets=function(){return this.localState.activeTargetIds},Uf.prototype.isActiveQueryTarget=function(t){return this.localState.activeTargetIds.has(t)},Uf.prototype.start=function(){return this.localState=new xf,Promise.resolve()},Uf.prototype.handleUserChange=function(t,e,n){},Uf.prototype.setOnlineState=function(t){},Uf.prototype.shutdown=function(){},Uf.prototype.writeSequenceNumber=function(t){},Uf);function Uf(){this.localState=new xf,this.queryState={},this.syncEngine=null,this.onlineStateHandler=null,this.sequenceNumberHandler=null;}var Kf="FirestoreClient",Qf=(Wf.prototype.lruParams=function(){return Zu.withCacheSize(this.cacheSizeBytes)},Wf);function Wf(t,e){this.cacheSizeBytes=t,this.synchronizeTabs=e;}var jf=function(){},Gf=(zf.prototype.start=function(t){var n=this;this.verifyNotTerminated();var r=new Ji,i=new Ji,o=!1;return this.credentials.setChangeListener(function(e){o?n.asyncQueue.enqueueAndForget(function(){return n.handleCredentialChange(e)}):(o=!0,n.initializePersistence(t,i,e).then(function(t){return n.initializeRest(e,t)}).then(r.resolve,r.reject));}),this.asyncQueue.enqueueAndForget(function(){return r.promise}),i.promise},zf.prototype.enableNetwork=function(){var t=this;return this.verifyNotTerminated(),this.asyncQueue.enqueue(function(){return t.syncEngine.enableNetwork()})},zf.prototype.initializePersistence=function(t,e,n){var r=this;return t instanceof Qf?this.startIndexedDbPersistence(n,t).then(function(t){return e.resolve(),t}).catch(function(t){if(e.reject(t),!r.canFallback(t))throw t;return console.warn("Error enabling offline persistence. Falling back to persistence disabled: "+t),r.startMemoryPersistence()}):(e.resolve(),this.startMemoryPersistence())},zf.prototype.canFallback=function(t){return t instanceof zr?t.code===Gr.FAILED_PRECONDITION||t.code===Gr.UNIMPLEMENTED:!("undefined"!=typeof DOMException&&t instanceof DOMException)||22===t.code||20===t.code||11===t.code},zf.prototype.verifyNotTerminated=function(){if(this.asyncQueue.isShuttingDown)throw new zr(Gr.FAILED_PRECONDITION,"The client has already been terminated.")},zf.prototype.startIndexedDbPersistence=function(r,i){var t=this,o=fc.buildStoragePrefix(this.databaseInfo),a=new ef(this.databaseInfo.databaseId,{useProto3Json:!0});return Promise.resolve().then(function(){return p(t,void 0,void 0,function(){var e,n;return m(this,function(t){switch(t.label){case 0:if(i.synchronizeTabs&&!qf.isAvailable(this.platform))throw new zr(Gr.UNIMPLEMENTED,"IndexedDB persistence is only available on platforms that support LocalStorage.");return e=i.lruParams(),this.sharedClientState=i.synchronizeTabs?new qf(this.asyncQueue,this.platform,o,this.clientId,r):new Bf,[4,fc.createIndexedDbPersistence({allowTabSynchronization:i.synchronizeTabs,persistenceKey:o,clientId:this.clientId,platform:this.platform,queue:this.asyncQueue,serializer:a,lruParams:e,sequenceNumberSyncer:this.sharedClientState})];case 1:return n=t.sent(),[2,(this.persistence=n).referenceDelegate.garbageCollector]}})})})},zf.prototype.startMemoryPersistence=function(){return this.persistence=Ch.createEagerPersistence(this.clientId),this.sharedClientState=new Bf,Promise.resolve(null)},zf.prototype.initializeRest=function(c,h){var t=this;return Fr(Kf,"Initializing. user=",c.uid),this.platform.loadConnection(this.databaseInfo).then(function(u){return p(t,void 0,void 0,function(){var e,n,r,i,o,a,s=this;return m(this,function(t){switch(t.label){case 0:return e=new sh,this.localStore=new mh(this.persistence,e,c),[4,this.localStore.start()];case 1:return t.sent(),h&&(this.lruScheduler=new tc(h,this.asyncQueue,this.localStore)),n=this.platform.newConnectivityMonitor(),r=this.platform.newSerializer(this.databaseInfo.databaseId),i=new zh(this.asyncQueue,u,this.credentials,r),o=function(t){return s.syncEngine.applyOnlineStateChange(t,Xh.RemoteStore)},a=function(t){return s.syncEngine.applyOnlineStateChange(t,Xh.SharedClientState)},this.remoteStore=new Ll(this.localStore,i,this.asyncQueue,o,n),this.syncEngine=new wf(this.localStore,this.remoteStore,this.sharedClientState,c),this.sharedClientState.onlineStateHandler=a,this.remoteStore.syncEngine=this.syncEngine,this.sharedClientState.syncEngine=this.syncEngine,this.eventMgr=new of(this.syncEngine),[4,this.sharedClientState.start()];case 2:return t.sent(),[4,this.remoteStore.start()];case 3:return t.sent(),[4,this.persistence.setPrimaryStateListener(function(e){return p(s,void 0,void 0,function(){return m(this,function(t){switch(t.label){case 0:return [4,this.syncEngine.applyPrimaryState(e)];case 1:return t.sent(),this.lruScheduler&&(e&&!this.lruScheduler.started?this.lruScheduler.start():e||this.lruScheduler.stop()),[2]}})})})];case 4:return t.sent(),[4,this.persistence.setDatabaseDeletedListener(function(){return p(s,void 0,void 0,function(){return m(this,function(t){switch(t.label){case 0:return [4,this.terminate()];case 1:return t.sent(),[2]}})})})];case 5:return t.sent(),[2]}})})})},zf.prototype.handleCredentialChange=function(t){return this.asyncQueue.verifyOperationInProgress(),Fr(Kf,"Credential Changed. Current user: "+t.uid),this.syncEngine.handleCredentialChange(t)},zf.prototype.disableNetwork=function(){var t=this;return this.verifyNotTerminated(),this.asyncQueue.enqueue(function(){return t.syncEngine.disableNetwork()})},zf.prototype.terminate=function(){var t=this;return this.asyncQueue.enqueueAndInitiateShutdown(function(){return p(t,void 0,void 0,function(){return m(this,function(t){switch(t.label){case 0:return this.lruScheduler&&this.lruScheduler.stop(),[4,this.remoteStore.shutdown()];case 1:return t.sent(),[4,this.sharedClientState.shutdown()];case 2:return t.sent(),[4,this.persistence.shutdown()];case 3:return t.sent(),this.credentials.removeChangeListener(),[2]}})})})},zf.prototype.waitForPendingWrites=function(){var t=this;this.verifyNotTerminated();var e=new Ji;return this.asyncQueue.enqueueAndForget(function(){return t.syncEngine.registerPendingWritesCallback(e)}),e.promise},zf.prototype.listen=function(t,e,n){var r=this;this.verifyNotTerminated();var i=new sf(t,e,n);return this.asyncQueue.enqueueAndForget(function(){return r.eventMgr.listen(i)}),i},zf.prototype.unlisten=function(t){var e=this;this.clientTerminated||this.asyncQueue.enqueueAndForget(function(){return e.eventMgr.unlisten(t)});},zf.prototype.getDocumentFromLocalCache=function(t){var e=this;return this.verifyNotTerminated(),this.asyncQueue.enqueue(function(){return e.localStore.readDocument(t)}).then(function(t){if(t instanceof Vs)return t;if(t instanceof Ks)return null;throw new zr(Gr.UNAVAILABLE,"Failed to get document from cache. (However, this document may exist on the server. Run again without setting 'source' in the GetOptions to attempt to retrieve the document from the server.)")})},zf.prototype.getDocumentsFromLocalCache=function(i){var t=this;return this.verifyNotTerminated(),this.asyncQueue.enqueue(function(){return p(t,void 0,void 0,function(){var e,n,r;return m(this,function(t){switch(t.label){case 0:return [4,this.localStore.executeQuery(i,!0)];case 1:return e=t.sent(),n=new pf(i,e.remoteKeys),r=n.computeDocChanges(e.documents),[2,n.applyChanges(r,!1).snapshot]}})})})},zf.prototype.write=function(t){var e=this;this.verifyNotTerminated();var n=new Ji;return this.asyncQueue.enqueueAndForget(function(){return e.syncEngine.write(t,n)}),n.promise},zf.prototype.databaseId=function(){return this.databaseInfo.databaseId},zf.prototype.addSnapshotsInSyncListener=function(t){var e=this;this.verifyNotTerminated(),this.asyncQueue.enqueueAndForget(function(){return e.eventMgr.addSnapshotsInSyncListener(t),Promise.resolve()});},zf.prototype.removeSnapshotsInSyncListener=function(t){this.clientTerminated||this.eventMgr.removeSnapshotsInSyncListener(t);},Object.defineProperty(zf.prototype,"clientTerminated",{get:function(){return this.asyncQueue.isShuttingDown},enumerable:!0,configurable:!0}),zf.prototype.transaction=function(t){var e=this;this.verifyNotTerminated();var n=new Ji;return this.asyncQueue.enqueueAndForget(function(){return e.syncEngine.runTransaction(e.asyncQueue,t,n),Promise.resolve()}),n.promise},zf);function zf(t,e,n,r){this.platform=t,this.databaseInfo=e,this.credentials=n,this.asyncQueue=r,this.clientId=wi.newId();}var Hf=(Yf.prototype.next=function(t){this.scheduleEvent(this.observer.next,t);},Yf.prototype.error=function(t){this.scheduleEvent(this.observer.error,t);},Yf.prototype.mute=function(){this.muted=!0;},Yf.prototype.scheduleEvent=function(t,e){var n=this;this.muted||setTimeout(function(){n.muted||t(e);},0);},Yf);function Yf(t){this.observer=t,this.muted=!1;}var Jf=(Xf.documentId=function(){return Xf._DOCUMENT_ID},Xf.prototype.isEqual=function(t){if(!(t instanceof Xf))throw yi("isEqual","FieldPath",1,t);return this._internalPath.isEqual(t._internalPath)},Xf._DOCUMENT_ID=new Xf(Wi.keyField().canonicalString()),Xf);function Xf(){for(var t=[],e=0;e<arguments.length;e++)t[e]=arguments[e];!function(t,e,n,r){if(!(e instanceof Array)||e.length<r)throw new zr(Gr.INVALID_ARGUMENT,"Function "+t+"() requires its "+n+" argument to be an array with at least "+bi(r,"element")+".")}("FieldPath",t,"fieldNames",1);for(var n=0;n<t.length;++n)if(oi("FieldPath","string",n,t[n]),0===t[n].length)throw new zr(Gr.INVALID_ARGUMENT,"Invalid field name at argument $(i + 1). Field names must not be empty.");this._internalPath=new Wi(t);}var Zf=new RegExp("[~\\*/\\[\\]]");var $f=function(t,e){this.user=e,this.type="OAuth",this.authHeaders={},this.authHeaders.Authorization="Bearer "+t;},tp=(ep.prototype.getToken=function(){return Promise.resolve(null)},ep.prototype.invalidateToken=function(){},ep.prototype.setChangeListener=function(t){Ur(!this.changeListener,"Can only call setChangeListener() once."),(this.changeListener=t)(Sf.UNAUTHENTICATED);},ep.prototype.removeChangeListener=function(){Ur(null!==this.changeListener,"removeChangeListener() when no listener registered"),this.changeListener=null;},ep);function ep(){this.changeListener=null;}var np=(rp.prototype.getToken=function(){var e=this;Ur(null!=this.tokenListener,"getToken cannot be called after listener removed.");var n=this.tokenCounter,t=this.forceRefresh;return this.forceRefresh=!1,this.auth?this.auth.getToken(t).then(function(t){if(e.tokenCounter!==n)throw new zr(Gr.ABORTED,"getToken aborted due to token change.");return t?(Ur("string"==typeof t.accessToken,"Invalid tokenData returned from getToken():"+t),new $f(t.accessToken,e.currentUser)):null}):Promise.resolve(null)},rp.prototype.invalidateToken=function(){this.forceRefresh=!0;},rp.prototype.setChangeListener=function(t){Ur(!this.changeListener,"Can only call setChangeListener() once."),this.changeListener=t,this.receivedInitialUser&&t(this.currentUser);},rp.prototype.removeChangeListener=function(){Ur(null!=this.tokenListener,"removeChangeListener() called twice"),Ur(null!==this.changeListener,"removeChangeListener() called when no listener registered"),this.auth&&this.auth.removeAuthTokenListener(this.tokenListener),this.tokenListener=null,this.changeListener=null;},rp.prototype.getUser=function(){var t=this.auth&&this.auth.getUid();return Ur(null===t||"string"==typeof t,"Received invalid UID: "+t),new Sf(t)},rp);function rp(t){var e=this;this.tokenListener=null,this.currentUser=Sf.UNAUTHENTICATED,this.receivedInitialUser=!1,this.tokenCounter=0,this.changeListener=null,this.forceRefresh=!1,this.tokenListener=function(){e.tokenCounter++,e.currentUser=e.getUser(),e.receivedInitialUser=!0,e.changeListener&&e.changeListener(e.currentUser);},this.tokenCounter=0,this.auth=t.getImmediate({optional:!0}),this.auth?this.auth.addAuthTokenListener(this.tokenListener):(this.tokenListener(null),t.get().then(function(t){e.auth=t,e.tokenListener&&e.auth.addAuthTokenListener(e.tokenListener);},function(){}));}var ip=(Object.defineProperty(op.prototype,"authHeaders",{get:function(){var t={"X-Goog-AuthUser":this.sessionIndex},e=this.gapi.auth.getAuthHeaderValueForFirstParty([]);return e&&(t.Authorization=e),t},enumerable:!0,configurable:!0}),op);function op(t,e){this.gapi=t,this.sessionIndex=e,this.type="FirstParty",this.user=Sf.FIRST_PARTY;}var ap=(sp.prototype.getToken=function(){return Promise.resolve(new ip(this.gapi,this.sessionIndex))},sp.prototype.setChangeListener=function(t){t(Sf.FIRST_PARTY);},sp.prototype.removeChangeListener=function(){},sp.prototype.invalidateToken=function(){},sp);function sp(t,e){this.gapi=t,this.sessionIndex=e;}function up(t){return function(t,e){if("object"!=typeof t||null===t)return !1;for(var n=t,r=0,i=e;r<i.length;r++){var o=i[r];if(o in n&&"function"==typeof n[o])return !0}return !1}(t,["next","error","complete"])}var cp=(hp.delete=function(){return ei("FieldValue.delete",arguments),fp.instance},hp.serverTimestamp=function(){return ei("FieldValue.serverTimestamp",arguments),mp.instance},hp.arrayUnion=function(){for(var t=[],e=0;e<arguments.length;e++)t[e]=arguments[e];return ri("FieldValue.arrayUnion",arguments,1),new vp(t)},hp.arrayRemove=function(){for(var t=[],e=0;e<arguments.length;e++)t[e]=arguments[e];return ri("FieldValue.arrayRemove",arguments,1),new Tp(t)},hp.increment=function(t){return oi("FieldValue.increment","number",1,t),ni("FieldValue.increment",arguments,1),new Ip(t)},hp.prototype.isEqual=function(t){return this===t},hp);function hp(t){this._methodName=t;}var lp,fp=(t(pp,lp=cp),pp.instance=new pp,pp);function pp(){return lp.call(this,"FieldValue.delete")||this}var dp,mp=(t(yp,dp=cp),yp.instance=new yp,yp);function yp(){return dp.call(this,"FieldValue.serverTimestamp")||this}var gp,vp=(t(bp,gp=cp),bp);function bp(t){var e=gp.call(this,"FieldValue.arrayUnion")||this;return e._elements=t,e}var wp,Tp=(t(Sp,wp=cp),Sp);function Sp(t){var e=wp.call(this,"FieldValue.arrayRemove")||this;return e._elements=t,e}var Ep,Ip=(t(Cp,Ep=cp),Cp);function Cp(t){var e=Ep.call(this,"FieldValue.increment")||this;return e._operand=t,e}var Dp=Yr(cp,"Use FieldValue.<field>() instead."),Np=/^__.*__$/,Ap=(kp.prototype.toMutations=function(t,e){var n=[];return null!==this.fieldMask?n.push(new Oa(t,this.data,this.fieldMask,e)):n.push(new Ma(t,this.data,e)),0<this.fieldTransforms.length&&n.push(new Fa(t,this.fieldTransforms)),n},kp);function kp(t,e,n){this.data=t,this.fieldMask=e,this.fieldTransforms=n;}var Rp,Mp,_p=(Lp.prototype.toMutations=function(t,e){var n=[new Oa(t,this.data,this.fieldMask,e)];return 0<this.fieldTransforms.length&&n.push(new Fa(t,this.fieldTransforms)),n},Lp);function Lp(t,e,n){this.data=t,this.fieldMask=e,this.fieldTransforms=n;}function Op(t){switch(t){case Rp.Set:case Rp.MergeSet:case Rp.Update:return !0;case Rp.Argument:case Rp.ArrayArgument:return !1;default:throw Br("Unexpected case for UserDataSource: "+t)}}(Mp=Rp=Rp||{})[Mp.Set=0]="Set",Mp[Mp.Update=1]="Update",Mp[Mp.MergeSet=2]="MergeSet",Mp[Mp.Argument=3]="Argument",Mp[Mp.ArrayArgument=4]="ArrayArgument";var Pp=(xp.prototype.childContextForField=function(t){var e=null==this.path?null:this.path.child(t),n=new xp(this.dataSource,this.methodName,e,!1,this.fieldTransforms,this.fieldMask);return n.validatePathSegment(t),n},xp.prototype.childContextForFieldPath=function(t){var e=null==this.path?null:this.path.child(t),n=new xp(this.dataSource,this.methodName,e,!1,this.fieldTransforms,this.fieldMask);return n.validatePath(),n},xp.prototype.childContextForArray=function(t){return new xp(this.dataSource,this.methodName,null,!0,this.fieldTransforms,this.fieldMask)},xp.prototype.createError=function(t){var e=null===this.path||this.path.isEmpty()?"":" (found in field "+this.path.toString()+")";return new zr(Gr.INVALID_ARGUMENT,"Function "+this.methodName+"() called with invalid data. "+t+e)},xp.prototype.contains=function(e){return void 0!==this.fieldMask.find(function(t){return e.isPrefixOf(t)})||void 0!==this.fieldTransforms.find(function(t){return e.isPrefixOf(t.field)})},xp.prototype.validatePath=function(){if(null!==this.path)for(var t=0;t<this.path.length;t++)this.validatePathSegment(this.path.get(t));},xp.prototype.validatePathSegment=function(t){if(0===t.length)throw this.createError("Document fields must not be empty");if(Op(this.dataSource)&&Np.test(t))throw this.createError('Document fields cannot begin and end with "__"')},xp);function xp(t,e,n,r,i,o){this.dataSource=t,this.methodName=e,this.path=n,this.arrayElement=r,void 0===i&&this.validatePath(),this.arrayElement=void 0!==r&&r,this.fieldTransforms=i||[],this.fieldMask=o||[];}var Fp=function(t,e){this.databaseId=t,this.key=e;},qp=(Vp.prototype.parseSetData=function(t,e){var n=new Pp(Rp.Set,t,Wi.EMPTY_PATH);Up("Data must be an object, but it was:",n,e);var r=this.parseData(e,n);return new Ap(r,null,n.fieldTransforms)},Vp.prototype.parseMergeData=function(t,e,n){var r=new Pp(Rp.MergeSet,t,Wi.EMPTY_PATH);Up("Data must be an object, but it was:",r,e);var i,o,a=this.parseData(e,r);if(n){for(var s=new So(Wi.comparator),u=0,c=n;u<c.length;u++){var h=c[u],l=void 0;if(h instanceof Jf)l=h._internalPath;else{if("string"!=typeof h)throw Br("Expected stringOrFieldPath to be a string or a FieldPath");l=Qp(t,h);}if(!r.contains(l))throw new zr(Gr.INVALID_ARGUMENT,"Field '"+l+"' is specified in your field mask but missing from your input data.");s=s.add(l);}i=ba.fromSet(s),o=r.fieldTransforms.filter(function(t){return i.covers(t.field)});}else i=ba.fromArray(r.fieldMask),o=r.fieldTransforms;return new Ap(a,i,o)},Vp.prototype.parseUpdateData=function(o,t){var a=this,s=new Pp(Rp.Update,o,Wi.EMPTY_PATH);Up("Data must be an object, but it was:",s,t);var u=new So(Wi.comparator),c=Ms.EMPTY;$r(t,function(t,e){var n=Qp(o,t),r=s.childContextForFieldPath(n);if((e=a.runPreConverter(e,r))instanceof fp)u=u.add(n);else{var i=a.parseData(e,r);null!=i&&(u=u.add(n),c=c.set(n,i));}});var e=ba.fromSet(u);return new _p(c,e,s.fieldTransforms)},Vp.prototype.parseUpdateVarargs=function(t,e,n,r){var i=new Pp(Rp.Update,t,Wi.EMPTY_PATH),o=[Kp(t,e)],a=[n];if(r.length%2!=0)throw new zr(Gr.INVALID_ARGUMENT,"Function "+t+"() needs to be called with an even number of arguments that alternate between field names and values.");for(var s=0;s<r.length;s+=2)o.push(Kp(t,r[s])),a.push(r[s+1]);var u=new So(Wi.comparator),c=Ms.EMPTY;for(s=0;s<o.length;++s){var h=o[s],l=i.childContextForFieldPath(h),f=this.runPreConverter(a[s],l);if(f instanceof fp)u=u.add(h);else{var p=this.parseData(f,l);null!=p&&(u=u.add(h),c=c.set(h,p));}}var d=ba.fromSet(u);return new _p(c,d,i.fieldTransforms)},Vp.prototype.parseQueryValue=function(t,e,n){void 0===n&&(n=!1);var r=new Pp(n?Rp.ArrayArgument:Rp.Argument,t,Wi.EMPTY_PATH),i=this.parseData(e,r);return Ur(null!=i,"Parsed data should not be null."),Ur(0===r.fieldTransforms.length,"Field transforms should have been disallowed."),i},Vp.prototype.runPreConverter=function(t,e){try{return this.preConverter(t)}catch(t){var n=Wp(t);throw e.createError(n)}},Vp.prototype.parseData=function(t,e){if(Bp(t=this.runPreConverter(t,e)))return Up("Unsupported field value:",e,t),this.parseObject(t,e);if(t instanceof cp)return this.parseSentinelFieldValue(t,e),null;if(e.path&&e.fieldMask.push(e.path),t instanceof Array){if(e.arrayElement&&e.dataSource!==Rp.ArrayArgument)throw e.createError("Nested arrays are not supported");return this.parseArray(t,e)}return this.parseScalarValue(t,e)},Vp.prototype.parseObject=function(t,r){var i=this,o=new po(Si);return ti(t)?r.path&&0<r.path.length&&r.fieldMask.push(r.path):$r(t,function(t,e){var n=i.parseData(e,r.childContextForField(t));null!=n&&(o=o.insert(t,n));}),new Ms(o)},Vp.prototype.parseArray=function(t,e){for(var n=[],r=0,i=0,o=t;i<o.length;i++){var a=o[i],s=this.parseData(a,e.childContextForArray(r));null==s&&(s=Xa.INSTANCE),n.push(s),r++;}return new Os(n)},Vp.prototype.parseSentinelFieldValue=function(t,e){if(!Op(e.dataSource))throw e.createError(t._methodName+"() can only be used with update() and set()");if(null===e.path)throw e.createError(t._methodName+"() is not currently supported inside arrays");if(t instanceof fp){if(e.dataSource!==Rp.MergeSet)throw e.dataSource===Rp.Update?(Ur(0<e.path.length,"FieldValue.delete() at the top level should have already been handled."),e.createError("FieldValue.delete() can only appear at the top level of your update data")):e.createError("FieldValue.delete() cannot be used with set() unless you pass {merge:true}");e.fieldMask.push(e.path);}else if(t instanceof mp)e.fieldTransforms.push(new Ta(e.path,Fl.instance));else if(t instanceof vp){var n=this.parseArrayTransformElements(t._methodName,t._elements),r=new Vl(n);e.fieldTransforms.push(new Ta(e.path,r));}else if(t instanceof Tp){n=this.parseArrayTransformElements(t._methodName,t._elements);var i=new Ul(n);e.fieldTransforms.push(new Ta(e.path,i));}else if(t instanceof Ip){var o=this.parseQueryValue("FieldValue.increment",t._operand),a=new Ql(o);e.fieldTransforms.push(new Ta(e.path,a));}else Br("Unknown FieldValue type: "+t);},Vp.prototype.parseScalarValue=function(t,e){if(null===t)return Xa.INSTANCE;if("number"==typeof t)return Cc(t)?new ss(t):new hs(t);if("boolean"==typeof t)return ts.of(t);if("string"==typeof t)return new ps(t);if(t instanceof Date)return new ys(co.fromDate(t));if(t instanceof co)return new ys(new co(t.seconds,1e3*Math.floor(t.nanoseconds/1e3)));if(t instanceof Pl)return new As(t);if(t instanceof Ni)return new Ss(t);if(t instanceof Fp)return new Cs(t.databaseId,t.key);throw e.createError("Unsupported field value: "+pi(t))},Vp.prototype.parseArrayTransformElements=function(r,t){var i=this;return t.map(function(t,e){var n=new Pp(Rp.Argument,r,Wi.EMPTY_PATH);return i.parseData(t,n.childContextForArray(e))})},Vp);function Vp(t){this.preConverter=t;}function Bp(t){return !("object"!=typeof t||null===t||t instanceof Array||t instanceof Date||t instanceof co||t instanceof Pl||t instanceof Ni||t instanceof Fp||t instanceof cp)}function Up(t,e,n){if(!Bp(n)||!fi(n)){var r=pi(n);throw "an object"===r?e.createError(t+" a custom object"):e.createError(t+" "+r)}}function Kp(t,e){if(e instanceof Jf)return e._internalPath;if("string"==typeof e)return Qp(t,e);throw new zr(Gr.INVALID_ARGUMENT,"Function "+t+"() called with invalid data. Field path arguments must be of type string or FieldPath.")}function Qp(e,t){try{return function(e){if(0<=e.search(Zf))throw new zr(Gr.INVALID_ARGUMENT,"Invalid field path ("+e+"). Paths must not contain '~', '*', '/', '[', or ']'");try{return new(Jf.bind.apply(Jf,a([void 0],e.split("."))))}catch(t){throw new zr(Gr.INVALID_ARGUMENT,"Invalid field path ("+e+"). Paths must not be empty, begin with '.', end with '.', or contain '..'")}}(t)._internalPath}catch(t){var n=Wp(t);throw new zr(Gr.INVALID_ARGUMENT,"Function "+e+"() called with invalid data. "+n)}}function Wp(t){return t instanceof Error?t.message:t.toString()}var jp=Zu.COLLECTION_DISABLED,Gp=(zp.prototype.isEqual=function(t){return this.host===t.host&&this.ssl===t.ssl&&this.timestampsInSnapshots===t.timestampsInSnapshots&&this.credentials===t.credentials&&this.cacheSizeBytes===t.cacheSizeBytes&&this.forceLongPolling===t.forceLongPolling},zp);function zp(t){if(void 0===t.host){if(void 0!==t.ssl)throw new zr(Gr.INVALID_ARGUMENT,"Can't provide ssl option if host option is not set");this.host="firestore.googleapis.com",this.ssl=!0;}else si("settings","non-empty string","host",t.host),this.host=t.host,ui("settings","boolean","ssl",t.ssl),this.ssl=Xr(t.ssl,!0);if(mi("settings",t,["host","ssl","credentials","timestampsInSnapshots","cacheSizeBytes","experimentalForceLongPolling"]),ui("settings","object","credentials",t.credentials),this.credentials=t.credentials,ui("settings","boolean","timestampsInSnapshots",t.timestampsInSnapshots),!0===t.timestampsInSnapshots?qr("\n  The timestampsInSnapshots setting now defaults to true and you no\n  longer need to explicitly set it. In a future release, the setting\n  will be removed entirely and so it is recommended that you remove it\n  from your firestore.settings() call now."):!1===t.timestampsInSnapshots&&qr("\n  The timestampsInSnapshots setting will soon be removed. YOU MUST UPDATE\n  YOUR CODE.\n\n  To hide this warning, stop using the timestampsInSnapshots setting in your\n  firestore.settings({ ... }) call.\n\n  Once you remove the setting, Timestamps stored in Cloud Firestore will be\n  read back as Firebase Timestamp objects instead of as system Date objects.\n  So you will also need to update code expecting a Date to instead expect a\n  Timestamp. For example:\n\n  // Old:\n  const date = snapshot.get('created_at');\n  // New:\n  const timestamp = snapshot.get('created_at'); const date =\n  timestamp.toDate();\n\n  Please audit all existing usages of Date when you enable the new\n  behavior."),this.timestampsInSnapshots=Xr(t.timestampsInSnapshots,!0),ui("settings","number","cacheSizeBytes",t.cacheSizeBytes),void 0===t.cacheSizeBytes)this.cacheSizeBytes=Zu.DEFAULT_CACHE_SIZE_BYTES;else{if(t.cacheSizeBytes!==jp&&t.cacheSizeBytes<Zu.MINIMUM_CACHE_SIZE_BYTES)throw new zr(Gr.INVALID_ARGUMENT,"cacheSizeBytes must be at least "+Zu.MINIMUM_CACHE_SIZE_BYTES);this.cacheSizeBytes=t.cacheSizeBytes;}ui("settings","boolean","experimentalForceLongPolling",t.experimentalForceLongPolling),this.forceLongPolling=void 0!==t.experimentalForceLongPolling&&t.experimentalForceLongPolling;}var Hp=(Yp.prototype.settings=function(t){if(ni("Firestore.settings",arguments,1),oi("Firestore.settings","object",1,t),Jr(t,"persistence"))throw new zr(Gr.INVALID_ARGUMENT,'"persistence" is now specified with a separate call to firestore.enablePersistence().');var e=new Gp(t);if(this._firestoreClient&&!this._settings.isEqual(e))throw new zr(Gr.FAILED_PRECONDITION,"Firestore has already been started and its settings can no longer be changed. You can only call settings() before calling any other methods on a Firestore object.");void 0!==(this._settings=e).credentials&&(this._credentials=function(t){if(!t)return new tp;switch(t.type){case"gapi":var e=t.client;return Ur(!("object"!=typeof e||null===e||!e.auth||!e.auth.getAuthHeaderValueForFirstParty),"unexpected gapi interface"),new ap(e,t.sessionIndex||"0");case"provider":return t.client;default:throw new zr(Gr.INVALID_ARGUMENT,"makeCredentialsProvider failed due to invalid credential type")}}(e.credentials));},Yp.prototype.enableNetwork=function(){return this.ensureClientConfigured(),this._firestoreClient.enableNetwork()},Yp.prototype.disableNetwork=function(){return this.ensureClientConfigured(),this._firestoreClient.disableNetwork()},Yp.prototype.enablePersistence=function(t){if(this._firestoreClient)throw new zr(Gr.FAILED_PRECONDITION,"Firestore has already been started and persistence can no longer be enabled. You can only call enablePersistence() before calling any other methods on a Firestore object.");var e=!1;return t&&(void 0!==t.experimentalTabSynchronization&&qr("The 'experimentalTabSynchronization' setting has been renamed to 'synchronizeTabs'. In a future release, the setting will be removed and it is recommended that you update your firestore.enablePersistence() call to use 'synchronizeTabs'."),e=Xr(void 0!==t.synchronizeTabs?t.synchronizeTabs:t.experimentalTabSynchronization,!1)),this.configureClient(new Qf(this._settings.cacheSizeBytes,e))},Yp.prototype.clearPersistence=function(){var t=this,n=fc.buildStoragePrefix(this.makeDatabaseInfo()),r=new Ji;return this._queue.enqueueAndForgetEvenAfterShutdown(function(){return p(t,void 0,void 0,function(){var e;return m(this,function(t){switch(t.label){case 0:if(t.trys.push([0,2,,3]),void 0!==this._firestoreClient&&!this._firestoreClient.clientTerminated)throw new zr(Gr.FAILED_PRECONDITION,"Persistence cannot be cleared after this Firestore instance is initialized.");return [4,fc.clearPersistence(n)];case 1:return t.sent(),r.resolve(),[3,3];case 2:return e=t.sent(),r.reject(e),[3,3];case 3:return [2]}})})}),r.promise},Yp.prototype.terminate=function(){return this.app._removeServiceInstance("firestore"),this.INTERNAL.delete()},Object.defineProperty(Yp.prototype,"_isTerminated",{get:function(){return this.ensureClientConfigured(),this._firestoreClient.clientTerminated},enumerable:!0,configurable:!0}),Yp.prototype.waitForPendingWrites=function(){return this.ensureClientConfigured(),this._firestoreClient.waitForPendingWrites()},Yp.prototype.onSnapshotsInSync=function(t){if(this.ensureClientConfigured(),up(t))return this.onSnapshotsInSyncInternal(t);oi("Firestore.onSnapshotsInSync","function",1,t);var e={next:t};return this.onSnapshotsInSyncInternal(e)},Yp.prototype.onSnapshotsInSyncInternal=function(t){var e=this,n=new Hf({next:function(){t.next&&t.next();},error:function(t){throw Br("Uncaught Error in onSnapshotsInSync")}});return this._firestoreClient.addSnapshotsInSyncListener(n),function(){n.mute(),e._firestoreClient.removeSnapshotsInSyncListener(n);}},Yp.prototype.ensureClientConfigured=function(){return this._firestoreClient||this.configureClient(new jf),this._firestoreClient},Yp.prototype.makeDatabaseInfo=function(){return new Ri(this._databaseId,this._persistenceKey,this._settings.host,this._settings.ssl,this._settings.forceLongPolling)},Yp.prototype.configureClient=function(t){Ur(!!this._settings.host,"FirestoreSettings.host is not set"),Ur(!this._firestoreClient,"configureClient() called multiple times");var e=this.makeDatabaseInfo();return this._firestoreClient=new Gf(Kr.getPlatform(),e,this._credentials,this._queue),this._firestoreClient.start(t)},Yp.prototype.createDataConverter=function(r){return new qp(function(t){if(t instanceof td){var e=r,n=t.firestore._databaseId;if(!n.isEqual(e))throw new zr(Gr.INVALID_ARGUMENT,"Document reference is for database "+n.projectId+"/"+n.database+" but should be for database "+e.projectId+"/"+e.database);return new Fp(r,t._key)}return t})},Yp.databaseIdFromApp=function(t){var e=t.options;if(!Jr(e,"projectId"))throw new zr(Gr.INVALID_ARGUMENT,'"projectId" not provided in firebase.initializeApp.');var n=e.projectId;if(!n||"string"!=typeof n)throw new zr(Gr.INVALID_ARGUMENT,"projectId must be a string in FirebaseApp.options");return new _i(n)},Object.defineProperty(Yp.prototype,"app",{get:function(){if(!this._firebaseApp)throw new zr(Gr.FAILED_PRECONDITION,"Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._firebaseApp},enumerable:!0,configurable:!0}),Yp.prototype.collection=function(t){return ni("Firestore.collection",arguments,1),oi("Firestore.collection","non-empty string",1,t),this.ensureClientConfigured(),new dd(Bi.fromString(t),this)},Yp.prototype.doc=function(t){return ni("Firestore.doc",arguments,1),oi("Firestore.doc","non-empty string",1,t),this.ensureClientConfigured(),td.forPath(Bi.fromString(t),this)},Yp.prototype.collectionGroup=function(t){if(ni("Firestore.collectionGroup",arguments,1),oi("Firestore.collectionGroup","non-empty string",1,t),0<=t.indexOf("/"))throw new zr(Gr.INVALID_ARGUMENT,"Invalid collection ID '"+t+"' passed to function Firestore.collectionGroup(). Collection IDs must not contain '/'.");return this.ensureClientConfigured(),new cd(new Rc(Bi.EMPTY_PATH,t),this)},Yp.prototype.runTransaction=function(e){var n=this;return ni("Firestore.runTransaction",arguments,1),oi("Firestore.runTransaction","function",1,e),this.ensureClientConfigured().transaction(function(t){return e(new Jp(n,t))})},Yp.prototype.batch=function(){return this.ensureClientConfigured(),new Zp(this)},Object.defineProperty(Yp,"logLevel",{get:function(){switch(Pr()){case Cr.DEBUG:return "debug";case Cr.ERROR:return "error";case Cr.SILENT:return "silent";default:return Br("Unknown log level: "+Pr())}},enumerable:!0,configurable:!0}),Yp.setLogLevel=function(t){switch(ni("Firestore.setLogLevel",arguments,1),oi("Firestore.setLogLevel","non-empty string",1,t),t){case"debug":xr(Cr.DEBUG);break;case"error":xr(Cr.ERROR);break;case"silent":xr(Cr.SILENT);break;default:throw new zr(Gr.INVALID_ARGUMENT,"Invalid log level: "+t)}},Yp.prototype._areTimestampsInSnapshotsEnabled=function(){return this._settings.timestampsInSnapshots},Yp);function Yp(t,e){var n=this;if(this._firebaseApp=null,this._queue=new $i,this.INTERNAL={delete:function(){return p(n,void 0,void 0,function(){return m(this,function(t){switch(t.label){case 0:return this.ensureClientConfigured(),[4,this._firestoreClient.terminate()];case 1:return t.sent(),[2]}})})}},"object"==typeof t.options){var r=t;this._firebaseApp=r,this._databaseId=Yp.databaseIdFromApp(r),this._persistenceKey=r.name,this._credentials=new np(e);}else{var i=t;if(!i.projectId)throw new zr(Gr.INVALID_ARGUMENT,"Must provide projectId");this._databaseId=new _i(i.projectId,i.database),this._persistenceKey="[DEFAULT]",this._credentials=new tp;}this._settings=new Gp({}),this._dataConverter=this.createDataConverter(this._databaseId);}var Jp=(Xp.prototype.get=function(t){var n=this;ni("Transaction.get",arguments,1);var r=bd("Transaction.get",t,this._firestore);return this._transaction.lookup([r._key]).then(function(t){if(!t||1!==t.length)return Br("Mismatch in docs returned from document lookup.");var e=t[0];if(e instanceof Ks)return new id(n._firestore,r._key,null,!1,!1,r._converter);if(e instanceof Vs)return new id(n._firestore,r._key,e,!1,!1,r._converter);throw Br("BatchGetDocumentsRequest returned unexpected document type: "+e.constructor.name)})},Xp.prototype.set=function(t,e,n){ii("Transaction.set",arguments,2,3);var r=bd("Transaction.set",t,this._firestore);n=yd("Transaction.set",n);var i=wd(r._converter,e,"Transaction.set"),o=i[0],a=i[1],s=n.merge||n.mergeFields?this._firestore._dataConverter.parseMergeData(a,o,n.mergeFields):this._firestore._dataConverter.parseSetData(a,o);return this._transaction.set(r._key,s),this},Xp.prototype.update=function(t,e,n){for(var r,i,o=[],a=3;a<arguments.length;a++)o[a-3]=arguments[a];return i="string"==typeof e||e instanceof Jf?(ri("Transaction.update",arguments,3),r=bd("Transaction.update",t,this._firestore),this._firestore._dataConverter.parseUpdateVarargs("Transaction.update",e,n,o)):(ni("Transaction.update",arguments,2),r=bd("Transaction.update",t,this._firestore),this._firestore._dataConverter.parseUpdateData("Transaction.update",e)),this._transaction.update(r._key,i),this},Xp.prototype.delete=function(t){ni("Transaction.delete",arguments,1);var e=bd("Transaction.delete",t,this._firestore);return this._transaction.delete(e._key),this},Xp);function Xp(t,e){this._firestore=t,this._transaction=e;}var Zp=($p.prototype.set=function(t,e,n){ii("WriteBatch.set",arguments,2,3),this.verifyNotCommitted();var r=bd("WriteBatch.set",t,this._firestore);n=yd("WriteBatch.set",n);var i=wd(r._converter,e,"WriteBatch.set"),o=i[0],a=i[1],s=n.merge||n.mergeFields?this._firestore._dataConverter.parseMergeData(a,o,n.mergeFields):this._firestore._dataConverter.parseSetData(a,o);return this._mutations=this._mutations.concat(s.toMutations(r._key,Da.NONE)),this},$p.prototype.update=function(t,e,n){for(var r,i,o=[],a=3;a<arguments.length;a++)o[a-3]=arguments[a];return this.verifyNotCommitted(),i="string"==typeof e||e instanceof Jf?(ri("WriteBatch.update",arguments,3),r=bd("WriteBatch.update",t,this._firestore),this._firestore._dataConverter.parseUpdateVarargs("WriteBatch.update",e,n,o)):(ni("WriteBatch.update",arguments,2),r=bd("WriteBatch.update",t,this._firestore),this._firestore._dataConverter.parseUpdateData("WriteBatch.update",e)),this._mutations=this._mutations.concat(i.toMutations(r._key,Da.exists(!0))),this},$p.prototype.delete=function(t){ni("WriteBatch.delete",arguments,1),this.verifyNotCommitted();var e=bd("WriteBatch.delete",t,this._firestore);return this._mutations=this._mutations.concat(new Wa(e._key,Da.NONE)),this},$p.prototype.commit=function(){return p(this,void 0,void 0,function(){return m(this,function(t){return this.verifyNotCommitted(),this._committed=!0,0<this._mutations.length?[2,this._firestore.ensureClientConfigured().write(this._mutations)]:[2]})})},$p.prototype.verifyNotCommitted=function(){if(this._committed)throw new zr(Gr.FAILED_PRECONDITION,"A write batch can no longer be used after commit() has been called.")},$p);function $p(t){this._firestore=t,this._mutations=[],this._committed=!1;}var td=(ed.forPath=function(t,e,n){if(t.length%2!=0)throw new zr(Gr.INVALID_ARGUMENT,"Invalid document reference. Document references must have an even number of segments, but "+t.canonicalString()+" has "+t.length);return new ed(new Gi(t),e,n)},Object.defineProperty(ed.prototype,"id",{get:function(){return this._key.path.lastSegment()},enumerable:!0,configurable:!0}),Object.defineProperty(ed.prototype,"parent",{get:function(){return new dd(this._key.path.popLast(),this.firestore,this._converter)},enumerable:!0,configurable:!0}),Object.defineProperty(ed.prototype,"path",{get:function(){return this._key.path.canonicalString()},enumerable:!0,configurable:!0}),ed.prototype.collection=function(t){if(ni("DocumentReference.collection",arguments,1),oi("DocumentReference.collection","non-empty string",1,t),!t)throw new zr(Gr.INVALID_ARGUMENT,"Must provide a non-empty collection name to collection()");var e=Bi.fromString(t);return new dd(this._key.path.child(e),this.firestore)},ed.prototype.isEqual=function(t){if(!(t instanceof ed))throw yi("isEqual","DocumentReference",1,t);return this.firestore===t.firestore&&this._key.isEqual(t._key)&&this._converter===t._converter},ed.prototype.set=function(t,e){ii("DocumentReference.set",arguments,1,2),e=yd("DocumentReference.set",e);var n=wd(this._converter,t,"DocumentReference.set"),r=n[0],i=n[1],o=e.merge||e.mergeFields?this.firestore._dataConverter.parseMergeData(i,r,e.mergeFields):this.firestore._dataConverter.parseSetData(i,r);return this._firestoreClient.write(o.toMutations(this._key,Da.NONE))},ed.prototype.update=function(t,e){for(var n,r=[],i=2;i<arguments.length;i++)r[i-2]=arguments[i];return n="string"==typeof t||t instanceof Jf?(ri("DocumentReference.update",arguments,2),this.firestore._dataConverter.parseUpdateVarargs("DocumentReference.update",t,e,r)):(ni("DocumentReference.update",arguments,1),this.firestore._dataConverter.parseUpdateData("DocumentReference.update",t)),this._firestoreClient.write(n.toMutations(this._key,Da.exists(!0)))},ed.prototype.delete=function(){return ni("DocumentReference.delete",arguments,0),this._firestoreClient.write([new Wa(this._key,Da.NONE)])},ed.prototype.onSnapshot=function(){for(var t=[],e=0;e<arguments.length;e++)t[e]=arguments[e];ii("DocumentReference.onSnapshot",arguments,1,4);var n,r={includeMetadataChanges:!1},i=0;"object"!=typeof t[i]||up(t[i])||(mi("DocumentReference.onSnapshot",r=t[i],["includeMetadataChanges"]),ui("DocumentReference.onSnapshot","boolean","includeMetadataChanges",r.includeMetadataChanges),i++);var o={includeMetadataChanges:r.includeMetadataChanges};return n=up(t[i])?t[i]:(oi("DocumentReference.onSnapshot","function",i,t[i]),ai("DocumentReference.onSnapshot","function",i+1,t[i+1]),ai("DocumentReference.onSnapshot","function",i+2,t[i+2]),{next:t[i],error:t[i+1],complete:t[i+2]}),this.onSnapshotInternal(o,n)},ed.prototype.onSnapshotInternal=function(t,n){var r=this,e=function(t){console.error("Uncaught Error in onSnapshot:",t);};n.error&&(e=n.error.bind(n));var i=new Hf({next:function(t){if(n.next){Ur(t.docs.size<=1,"Too many documents returned on a document query");var e=t.docs.get(r._key);n.next(new id(r.firestore,r._key,e,t.fromCache,t.hasPendingWrites,r._converter));}},error:e}),o=this._firestoreClient.listen(Rc.atPath(this._key.path),i,t);return function(){i.mute(),r._firestoreClient.unlisten(o);}},ed.prototype.get=function(n){var r=this;return ii("DocumentReference.get",arguments,0,1),vd("DocumentReference.get",n),new Promise(function(e,t){n&&"cache"===n.source?r.firestore.ensureClientConfigured().getDocumentFromLocalCache(r._key).then(function(t){e(new id(r.firestore,r._key,t,!0,t instanceof Vs&&t.hasLocalMutations,r._converter));},t):r.getViaSnapshotListener(e,t,n);})},ed.prototype.getViaSnapshotListener=function(e,n,r){var i=this.onSnapshotInternal({includeMetadataChanges:!0,waitForSyncWhenOnline:!0},{next:function(t){i(),!t.exists&&t.metadata.fromCache?n(new zr(Gr.UNAVAILABLE,"Failed to get document because the client is offline.")):t.exists&&t.metadata.fromCache&&r&&"server"===r.source?n(new zr(Gr.UNAVAILABLE,'Failed to get document from server. (However, this document does exist in the local cache. Run again without setting source to "server" to retrieve the cached document.)')):e(t);},error:n});},ed.prototype.withConverter=function(t){return new ed(this._key,this.firestore,t)},ed);function ed(t,e,n){this._key=t,this.firestore=e,this._converter=n,this._firestoreClient=this.firestore.ensureClientConfigured();}var nd=(rd.prototype.isEqual=function(t){return this.hasPendingWrites===t.hasPendingWrites&&this.fromCache===t.fromCache},rd);function rd(t,e){this.hasPendingWrites=t,this.fromCache=e;}var id=(od.prototype.data=function(t){if(ii("DocumentSnapshot.data",arguments,0,1),t=gd("DocumentSnapshot.data",t),this._document){if(this._converter){var e=new sd(this._firestore,this._key,this._document,this._fromCache,this._hasPendingWrites);return this._converter.fromFirestore(e,t)}return this.toJSObject(this._document.data(),Ga.fromSnapshotOptions(t,this._firestore._areTimestampsInSnapshotsEnabled()))}},od.prototype.get=function(t,e){if(ii("DocumentSnapshot.get",arguments,1,2),e=gd("DocumentSnapshot.get",e),this._document){var n=this._document.data().field(Kp("DocumentSnapshot.get",t));if(null!==n)return this.toJSValue(n,Ga.fromSnapshotOptions(e,this._firestore._areTimestampsInSnapshotsEnabled()))}},Object.defineProperty(od.prototype,"id",{get:function(){return this._key.path.lastSegment()},enumerable:!0,configurable:!0}),Object.defineProperty(od.prototype,"ref",{get:function(){return new td(this._key,this._firestore,this._converter)},enumerable:!0,configurable:!0}),Object.defineProperty(od.prototype,"exists",{get:function(){return null!==this._document},enumerable:!0,configurable:!0}),Object.defineProperty(od.prototype,"metadata",{get:function(){return new nd(this._hasPendingWrites,this._fromCache)},enumerable:!0,configurable:!0}),od.prototype.isEqual=function(t){if(!(t instanceof od))throw yi("isEqual","DocumentSnapshot",1,t);return this._firestore===t._firestore&&this._fromCache===t._fromCache&&this._key.isEqual(t._key)&&(null===this._document?null===t._document:this._document.isEqual(t._document))&&this._converter===t._converter},od.prototype.toJSObject=function(t,n){var r=this,i={};return t.forEach(function(t,e){i[t]=r.toJSValue(e,n);}),i},od.prototype.toJSValue=function(t,e){if(t instanceof Ms)return this.toJSObject(t,e);if(t instanceof Os)return this.toJSArray(t,e);if(t instanceof Cs){var n=t.value(e),r=this._firestore.ensureClientConfigured().databaseId();return t.databaseId.isEqual(r)||qr("Document "+this._key.path+" contains a document reference within a different database ("+t.databaseId.projectId+"/"+t.databaseId.database+") which is not supported. It will be treated as a reference in the current database ("+r.projectId+"/"+r.database+") instead."),new td(n,this._firestore,this._converter)}return t.value(e)},od.prototype.toJSArray=function(t,e){var n=this;return t.internalValue.map(function(t){return n.toJSValue(t,e)})},od);function od(t,e,n,r,i,o){this._firestore=t,this._key=e,this._document=n,this._fromCache=r,this._hasPendingWrites=i,this._converter=o;}var ad,sd=(t(ud,ad=id),ud.prototype.data=function(t){var e=ad.prototype.data.call(this,t);return Ur(void 0!==e,"Document in a QueryDocumentSnapshot should exist"),e},ud);function ud(){return null!==ad&&ad.apply(this,arguments)||this}var cd=(hd.prototype.where=function(t,e,n){var r;ni("Query.where",arguments,3),di("Query.where",3,n),function(t,e,n,r){if(!e.some(function(t){return t===r}))throw new zr(Gr.INVALID_ARGUMENT,"Invalid value "+pi(r)+" provided to function "+t+"() for its "+vi(n)+" argument. Acceptable values: "+e.join(", "))}("Query.where",["<","<=","==",">=",">","array-contains","in","array-contains-any"],2,e);var i=Kp("Query.where",t),o=Lc.fromString(e);if(i.isKeyField()){if(o===Lc.ARRAY_CONTAINS||o===Lc.ARRAY_CONTAINS_ANY)throw new zr(Gr.INVALID_ARGUMENT,"Invalid Query. You can't perform '"+o.toString()+"' queries on FieldPath.documentId().");if(o===Lc.IN){this.validateDisjunctiveFilterElements(n,o);for(var a=[],s=0,u=n;s<u.length;s++){var c=u[s];a.push(this.parseDocumentIdValue(c));}r=new Os(a);}else r=this.parseDocumentIdValue(n);}else o!==Lc.IN&&o!==Lc.ARRAY_CONTAINS_ANY||this.validateDisjunctiveFilterElements(n,o),r=this.firestore._dataConverter.parseQueryValue("Query.where",n,o===Lc.IN);var h=xc.create(i,o,r);return this.validateNewFilter(h),new hd(this._query.addFilter(h),this.firestore,this._converter)},hd.prototype.orderBy=function(t,e){var n;if(ii("Query.orderBy",arguments,1,2),ai("Query.orderBy","non-empty string",2,e),void 0===e||"asc"===e)n=$c.ASCENDING;else{if("desc"!==e)throw new zr(Gr.INVALID_ARGUMENT,"Function Query.orderBy() has unknown direction '"+e+"', expected 'asc' or 'desc'.");n=$c.DESCENDING;}if(null!==this._query.startAt)throw new zr(Gr.INVALID_ARGUMENT,"Invalid query. You must not call Query.startAt() or Query.startAfter() before calling Query.orderBy().");if(null!==this._query.endAt)throw new zr(Gr.INVALID_ARGUMENT,"Invalid query. You must not call Query.endAt() or Query.endBefore() before calling Query.orderBy().");var r=Kp("Query.orderBy",t),i=new rh(r,n);return this.validateNewOrderBy(i),new hd(this._query.addOrderBy(i),this.firestore,this._converter)},hd.prototype.limit=function(t){return ni("Query.limit",arguments,1),oi("Query.limit","number",1,t),gi("Query.limit",1,t),new hd(this._query.withLimitToFirst(t),this.firestore,this._converter)},hd.prototype.limitToLast=function(t){return ni("Query.limitToLast",arguments,1),oi("Query.limitToLast","number",1,t),gi("Query.limitToLast",1,t),new hd(this._query.withLimitToLast(t),this.firestore,this._converter)},hd.prototype.startAt=function(t){for(var e=[],n=1;n<arguments.length;n++)e[n-1]=arguments[n];ri("Query.startAt",arguments,1);var r=this.boundFromDocOrFields("Query.startAt",t,e,!0);return new hd(this._query.withStartAt(r),this.firestore,this._converter)},hd.prototype.startAfter=function(t){for(var e=[],n=1;n<arguments.length;n++)e[n-1]=arguments[n];ri("Query.startAfter",arguments,1);var r=this.boundFromDocOrFields("Query.startAfter",t,e,!1);return new hd(this._query.withStartAt(r),this.firestore,this._converter)},hd.prototype.endBefore=function(t){for(var e=[],n=1;n<arguments.length;n++)e[n-1]=arguments[n];ri("Query.endBefore",arguments,1);var r=this.boundFromDocOrFields("Query.endBefore",t,e,!0);return new hd(this._query.withEndAt(r),this.firestore,this._converter)},hd.prototype.endAt=function(t){for(var e=[],n=1;n<arguments.length;n++)e[n-1]=arguments[n];ri("Query.endAt",arguments,1);var r=this.boundFromDocOrFields("Query.endAt",t,e,!1);return new hd(this._query.withEndAt(r),this.firestore,this._converter)},hd.prototype.isEqual=function(t){if(!(t instanceof hd))throw yi("isEqual","Query",1,t);return this.firestore===t.firestore&&this._query.isEqual(t._query)},hd.prototype.withConverter=function(t){return new hd(this._query,this.firestore,t)},hd.prototype.boundFromDocOrFields=function(t,e,n,r){if(di(t,1,e),e instanceof id){if(0<n.length)throw new zr(Gr.INVALID_ARGUMENT,"Too many arguments provided to "+t+"().");var i=e;if(!i.exists)throw new zr(Gr.NOT_FOUND,"Can't use a DocumentSnapshot that doesn't exist for "+t+"().");return this.boundFromDocument(t,i._document,r)}var o=[e].concat(n);return this.boundFromFields(t,o,r)},hd.prototype.boundFromDocument=function(t,e,n){for(var r=[],i=0,o=this._query.orderBy;i<o.length;i++){var a=o[i];if(a.field.isKeyField())r.push(new Cs(this.firestore._databaseId,e.key));else{var s=e.field(a.field);if(s instanceof bs)throw new zr(Gr.INVALID_ARGUMENT,'Invalid query. You are trying to start or end a query using a document for which the field "'+a.field+'" is an uncommitted server timestamp. (Since the value of this field is unknown, you cannot start/end a query with it.)');if(null===s){var u=a.field.canonicalString();throw new zr(Gr.INVALID_ARGUMENT,"Invalid query. You are trying to start or end a query using a document for which the field '"+u+"' (used as the orderBy) does not exist.")}r.push(s);}}return new eh(r,n)},hd.prototype.boundFromFields=function(t,e,n){var r=this._query.explicitOrderBy;if(e.length>r.length)throw new zr(Gr.INVALID_ARGUMENT,"Too many arguments provided to "+t+"(). The number of arguments must be less than or equal to the number of Query.orderBy() clauses");for(var i=[],o=0;o<e.length;o++){var a=e[o];if(r[o].field.isKeyField()){if("string"!=typeof a)throw new zr(Gr.INVALID_ARGUMENT,"Invalid query. Expected a string for document ID in "+t+"(), but got a "+typeof a);if(!this._query.isCollectionGroupQuery()&&-1!==a.indexOf("/"))throw new zr(Gr.INVALID_ARGUMENT,"Invalid query. When querying a collection and ordering by FieldPath.documentId(), the value passed to "+t+"() must be a plain document ID, but '"+a+"' contains a slash.");var s=this._query.path.child(Bi.fromString(a));if(!Gi.isDocumentKey(s))throw new zr(Gr.INVALID_ARGUMENT,"Invalid query. When querying a collection group and ordering by FieldPath.documentId(), the value passed to "+t+"() must result in a valid document path, but '"+s+"' is not because it contains an odd number of segments.");var u=new Gi(s);i.push(new Cs(this.firestore._databaseId,u));}else{var c=this.firestore._dataConverter.parseQueryValue(t,a);i.push(c);}}return new eh(i,n)},hd.prototype.onSnapshot=function(){for(var t=[],e=0;e<arguments.length;e++)t[e]=arguments[e];ii("Query.onSnapshot",arguments,1,4);var n,r={},i=0;return "object"!=typeof t[i]||up(t[i])||(mi("Query.onSnapshot",r=t[i],["includeMetadataChanges"]),ui("Query.onSnapshot","boolean","includeMetadataChanges",r.includeMetadataChanges),i++),n=up(t[i])?t[i]:(oi("Query.onSnapshot","function",i,t[i]),ai("Query.onSnapshot","function",i+1,t[i+1]),ai("Query.onSnapshot","function",i+2,t[i+2]),{next:t[i],error:t[i+1],complete:t[i+2]}),this.validateHasExplicitOrderByForLimitToLast(this._query),this.onSnapshotInternal(r,n)},hd.prototype.onSnapshotInternal=function(t,e){var n=this,r=function(t){console.error("Uncaught Error in onSnapshot:",t);};e.error&&(r=e.error.bind(e));var i=new Hf({next:function(t){e.next&&e.next(new ld(n.firestore,n._query,t,n._converter));},error:r}),o=this.firestore.ensureClientConfigured(),a=o.listen(this._query,i,t);return function(){i.mute(),o.unlisten(a);}},hd.prototype.validateHasExplicitOrderByForLimitToLast=function(t){if(t.hasLimitToLast()&&0===t.explicitOrderBy.length)throw new zr(Gr.UNIMPLEMENTED,"limitToLast() queries require specifying at least one orderBy() clause")},hd.prototype.get=function(n){var r=this;return ii("Query.get",arguments,0,1),vd("Query.get",n),this.validateHasExplicitOrderByForLimitToLast(this._query),new Promise(function(e,t){n&&"cache"===n.source?r.firestore.ensureClientConfigured().getDocumentsFromLocalCache(r._query).then(function(t){e(new ld(r.firestore,r._query,t,r._converter));},t):r.getViaSnapshotListener(e,t,n);})},hd.prototype.getViaSnapshotListener=function(e,n,r){var i=this.onSnapshotInternal({includeMetadataChanges:!0,waitForSyncWhenOnline:!0},{next:function(t){i(),t.metadata.fromCache&&r&&"server"===r.source?n(new zr(Gr.UNAVAILABLE,'Failed to get documents from server. (However, these documents may exist in the local cache. Run again without setting source to "server" to retrieve the cached documents.)')):e(t);},error:n});},hd.prototype.parseDocumentIdValue=function(t){if("string"==typeof t){if(""===t)throw new zr(Gr.INVALID_ARGUMENT,"Invalid query. When querying with FieldPath.documentId(), you must provide a valid document ID, but it was an empty string.");if(!this._query.isCollectionGroupQuery()&&-1!==t.indexOf("/"))throw new zr(Gr.INVALID_ARGUMENT,"Invalid query. When querying a collection by FieldPath.documentId(), you must provide a plain document ID, but '"+t+"' contains a '/' character.");var e=this._query.path.child(Bi.fromString(t));if(!Gi.isDocumentKey(e))throw new zr(Gr.INVALID_ARGUMENT,"Invalid query. When querying a collection group by FieldPath.documentId(), the value provided must result in a valid document path, but '"+e+"' is not because it has an odd number of segments ("+e.length+").");return new Cs(this.firestore._databaseId,new Gi(e))}if(t instanceof td){var n=t;return new Cs(this.firestore._databaseId,n._key)}throw new zr(Gr.INVALID_ARGUMENT,"Invalid query. When querying with FieldPath.documentId(), you must provide a valid string or a DocumentReference, but it was: "+pi(t)+".")},hd.prototype.validateDisjunctiveFilterElements=function(t,e){if(!Array.isArray(t)||0===t.length)throw new zr(Gr.INVALID_ARGUMENT,"Invalid Query. A non-empty array is required for '"+e.toString()+"' filters.");if(10<t.length)throw new zr(Gr.INVALID_ARGUMENT,"Invalid Query. '"+e.toString()+"' filters support a maximum of 10 elements in the value array.");if(0<=t.indexOf(null))throw new zr(Gr.INVALID_ARGUMENT,"Invalid Query. '"+e.toString()+"' filters cannot contain 'null' in the value array.");if(0<t.filter(function(t){return Number.isNaN(t)}).length)throw new zr(Gr.INVALID_ARGUMENT,"Invalid Query. '"+e.toString()+"' filters cannot contain 'NaN' in the value array.")},hd.prototype.validateNewFilter=function(t){if(t instanceof xc){var e=[Lc.ARRAY_CONTAINS,Lc.ARRAY_CONTAINS_ANY],n=[Lc.IN,Lc.ARRAY_CONTAINS_ANY],r=0<=e.indexOf(t.op),i=0<=n.indexOf(t.op);if(t.isInequality()){var o=this._query.getInequalityFilterField();if(null!==o&&!o.isEqual(t.field))throw new zr(Gr.INVALID_ARGUMENT,"Invalid query. All where filters with an inequality (<, <=, >, or >=) must be on the same field. But you have inequality filters on '"+o.toString()+"' and '"+t.field.toString()+"'");var a=this._query.getFirstOrderByField();null!==a&&this.validateOrderByAndInequalityMatch(t.field,a);}else if(i||r){var s=null;if(i&&(s=this._query.findFilterOperator(n)),null===s&&r&&(s=this._query.findFilterOperator(e)),null!=s)throw s===t.op?new zr(Gr.INVALID_ARGUMENT,"Invalid query. You cannot use more than one '"+t.op.toString()+"' filter."):new zr(Gr.INVALID_ARGUMENT,"Invalid query. You cannot use '"+t.op.toString()+"' filters with '"+s.toString()+"' filters.")}}},hd.prototype.validateNewOrderBy=function(t){if(null===this._query.getFirstOrderByField()){var e=this._query.getInequalityFilterField();null!==e&&this.validateOrderByAndInequalityMatch(e,t.field);}},hd.prototype.validateOrderByAndInequalityMatch=function(t,e){if(!e.isEqual(t))throw new zr(Gr.INVALID_ARGUMENT,"Invalid query. You have a where filter with an inequality (<, <=, >, or >=) on field '"+t.toString()+"' and so you must also use '"+t.toString()+"' as your first Query.orderBy(), but your first Query.orderBy() is on field '"+e.toString()+"' instead.")},hd);function hd(t,e,n){this._query=t,this.firestore=e,this._converter=n;}var ld=(Object.defineProperty(fd.prototype,"docs",{get:function(){var e=[];return this.forEach(function(t){return e.push(t)}),e},enumerable:!0,configurable:!0}),Object.defineProperty(fd.prototype,"empty",{get:function(){return this._snapshot.docs.isEmpty()},enumerable:!0,configurable:!0}),Object.defineProperty(fd.prototype,"size",{get:function(){return this._snapshot.docs.size},enumerable:!0,configurable:!0}),fd.prototype.forEach=function(e,n){var r=this;ii("QuerySnapshot.forEach",arguments,1,2),oi("QuerySnapshot.forEach","function",1,e),this._snapshot.docs.forEach(function(t){e.call(n,r.convertToDocumentImpl(t));});},Object.defineProperty(fd.prototype,"query",{get:function(){return new cd(this._originalQuery,this._firestore,this._converter)},enumerable:!0,configurable:!0}),fd.prototype.docChanges=function(t){t&&(mi("QuerySnapshot.docChanges",t,["includeMetadataChanges"]),ui("QuerySnapshot.docChanges","boolean","includeMetadataChanges",t.includeMetadataChanges));var e=!(!t||!t.includeMetadataChanges);if(e&&this._snapshot.excludesMetadataChanges)throw new zr(Gr.INVALID_ARGUMENT,"To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");return this._cachedChanges&&this._cachedChangesIncludeMetadataChanges===e||(this._cachedChanges=function(i,e,o,a){if(o.oldDocs.isEmpty()){var n,r=0;return o.docChanges.map(function(t){var e=new sd(i,t.doc.key,t.doc,o.fromCache,o.mutatedKeys.has(t.doc.key),a);return Ur(t.type===sl.Added,"Invalid event type for first snapshot"),Ur(!n||o.query.docComparator(n,t.doc)<0,"Got added events in wrong order"),n=t.doc,{type:"added",doc:e,oldIndex:-1,newIndex:r++}})}var s=o.oldDocs;return o.docChanges.filter(function(t){return e||t.type!==sl.Metadata}).map(function(t){var e=new sd(i,t.doc.key,t.doc,o.fromCache,o.mutatedKeys.has(t.doc.key),a),n=-1,r=-1;return t.type!==sl.Added&&(Ur(0<=(n=s.indexOf(t.doc.key)),"Index for document not found"),s=s.delete(t.doc.key)),t.type!==sl.Removed&&(r=(s=s.add(t.doc)).indexOf(t.doc.key)),{type:function(t){switch(t){case sl.Added:return "added";case sl.Modified:case sl.Metadata:return "modified";case sl.Removed:return "removed";default:return Br("Unknown change type: "+t)}}(t.type),doc:e,oldIndex:n,newIndex:r}})}(this._firestore,e,this._snapshot,this._converter),this._cachedChangesIncludeMetadataChanges=e),this._cachedChanges},fd.prototype.isEqual=function(t){if(!(t instanceof fd))throw yi("isEqual","QuerySnapshot",1,t);return this._firestore===t._firestore&&this._originalQuery.isEqual(t._originalQuery)&&this._snapshot.isEqual(t._snapshot)&&this._converter===t._converter},fd.prototype.convertToDocumentImpl=function(t){return new sd(this._firestore,t.key,t,this.metadata.fromCache,this._snapshot.mutatedKeys.has(t.key),this._converter)},fd);function fd(t,e,n,r){this._firestore=t,this._originalQuery=e,this._snapshot=n,this._converter=r,this._cachedChanges=null,this._cachedChangesIncludeMetadataChanges=null,this.metadata=new nd(n.hasPendingWrites,n.fromCache);}a(["length","forEach","map"],"undefined"!=typeof Symbol?[Symbol.iterator]:[]).forEach(function(t){try{Object.defineProperty(ld.prototype.docChanges,t,{get:function(){return function(){throw new zr(Gr.INVALID_ARGUMENT,'QuerySnapshot.docChanges has been changed from a property into a method, so usages like "querySnapshot.docChanges" should become "querySnapshot.docChanges()"')}()}});}catch(t){}});var pd,dd=(t(md,pd=cd),Object.defineProperty(md.prototype,"id",{get:function(){return this._query.path.lastSegment()},enumerable:!0,configurable:!0}),Object.defineProperty(md.prototype,"parent",{get:function(){var t=this._query.path.popLast();return t.isEmpty()?null:new td(new Gi(t),this.firestore)},enumerable:!0,configurable:!0}),Object.defineProperty(md.prototype,"path",{get:function(){return this._query.path.canonicalString()},enumerable:!0,configurable:!0}),md.prototype.doc=function(t){if(ii("CollectionReference.doc",arguments,0,1),0===arguments.length&&(t=wi.newId()),oi("CollectionReference.doc","non-empty string",1,t),""===t)throw new zr(Gr.INVALID_ARGUMENT,"Document path must be a non-empty string");var e=Bi.fromString(t);return td.forPath(this._query.path.child(e),this.firestore,this._converter)},md.prototype.add=function(t){ni("CollectionReference.add",arguments,1),oi("CollectionReference.add","object",1,t);var e=this.doc();return e.set(t).then(function(){return e})},md.prototype.withConverter=function(t){return new md(this._path,this.firestore,t)},md);function md(t,e,n){var r=pd.call(this,Rc.atPath(t),e,n)||this;if((r._path=t).length%2!=1)throw new zr(Gr.INVALID_ARGUMENT,"Invalid collection reference. Collection references must have an odd number of segments, but "+t.canonicalString()+" has "+t.length);return r}function yd(t,e){if(void 0===e)return {merge:!1};if(mi(t,e,["merge","mergeFields"]),ui(t,"boolean","merge",e.merge),ci(t,"mergeFields","a string or a FieldPath",e.mergeFields,function(t){return "string"==typeof t||t instanceof Jf}),void 0!==e.mergeFields&&void 0!==e.merge)throw new zr(Gr.INVALID_ARGUMENT,"Invalid options passed to function "+t+'(): You cannot specify both "merge" and "mergeFields".');return e}function gd(t,e){return void 0===e?{}:(mi(t,e,["serverTimestamps"]),hi(t,0,"serverTimestamps",e.serverTimestamps,["estimate","previous","none"]),e)}function vd(t,e){ai(t,"object",1,e),e&&(mi(t,e,["source"]),hi(t,0,"source",e.source,["default","server","cache"]));}function bd(t,e,n){if(e instanceof td){if(e.firestore!==n)throw new zr(Gr.INVALID_ARGUMENT,"Provided document reference is from a different Firestore instance.");return e}throw yi(t,"DocumentReference",1,e)}function wd(t,e,n){var r;return t?(r=t.toFirestore(e),n="toFirestore() in "+n):r=e,[r,n]}var Td=Yr(Hp,"Use firebase.firestore() instead."),Sd=Yr(Jp,"Use firebase.firestore().runTransaction() instead."),Ed=Yr(Zp,"Use firebase.firestore().batch() instead."),Id=Yr(td,"Use firebase.firestore().doc() instead."),Cd=Yr(id),Dd=Yr(sd),Nd=Yr(cd),Ad=Yr(ld),kd=Yr(dd,"Use firebase.firestore().collection() instead."),Rd={Firestore:Td,GeoPoint:Pl,Timestamp:co,Blob:ki,Transaction:Sd,WriteBatch:Ed,DocumentReference:Id,DocumentSnapshot:Cd,Query:Nd,QueryDocumentSnapshot:Dd,QuerySnapshot:Ad,CollectionReference:kd,FieldPath:Jf,FieldValue:Dp,setLogLevel:Hp.setLogLevel,CACHE_SIZE_UNLIMITED:jp};function Md(t){t.INTERNAL.registerComponent(new w("firestore",function(t){var e=t.getProvider("app").getImmediate();return new Hp(e,t.getProvider("auth-internal"))},"PUBLIC").setServiceProps(function(t){Ur(t&&"object"==typeof t,"shallowCopy() expects object parameter.");var e={};for(var n in t)Object.prototype.hasOwnProperty.call(t,n)&&(e[n]=t[n]);return e}(Rd)));}var _d=(Ld.prototype.addCallback=function(t){},Ld.prototype.shutdown=function(){},Ld);function Ld(){}var Od="ConnectivityMonitor",Pd=(xd.prototype.addCallback=function(t){this.callbacks.push(t);},xd.prototype.shutdown=function(){window.removeEventListener("online",this.networkAvailableListener),window.removeEventListener("offline",this.networkUnavailableListener);},xd.prototype.configureNetworkMonitoring=function(){window.addEventListener("online",this.networkAvailableListener),window.addEventListener("offline",this.networkUnavailableListener);},xd.prototype.onNetworkAvailable=function(){Fr(Od,"Network connectivity changed: AVAILABLE");for(var t=0,e=this.callbacks;t<e.length;t++)(0,e[t])(0);},xd.prototype.onNetworkUnavailable=function(){Fr(Od,"Network connectivity changed: UNAVAILABLE");for(var t=0,e=this.callbacks;t<e.length;t++)(0,e[t])(1);},xd.isAvailable=function(){return "undefined"!=typeof window&&void 0!==window.addEventListener&&void 0!==window.removeEventListener},xd);function xd(){var t=this;this.networkAvailableListener=function(){return t.onNetworkAvailable()},this.networkUnavailableListener=function(){return t.onNetworkUnavailable()},this.callbacks=[],this.configureNetworkMonitoring();}var Fd=(qd.prototype.onOpen=function(t){Ur(!this.wrappedOnOpen,"Called onOpen on stream twice!"),this.wrappedOnOpen=t;},qd.prototype.onClose=function(t){Ur(!this.wrappedOnClose,"Called onClose on stream twice!"),this.wrappedOnClose=t;},qd.prototype.onMessage=function(t){Ur(!this.wrappedOnMessage,"Called onMessage on stream twice!"),this.wrappedOnMessage=t;},qd.prototype.close=function(){this.closeFn();},qd.prototype.send=function(t){this.sendFn(t);},qd.prototype.callOnOpen=function(){Ur(void 0!==this.wrappedOnOpen,"Cannot call onOpen because no callback was set"),this.wrappedOnOpen();},qd.prototype.callOnClose=function(t){Ur(void 0!==this.wrappedOnClose,"Cannot call onClose because no callback was set"),this.wrappedOnClose(t);},qd.prototype.callOnMessage=function(t){Ur(void 0!==this.wrappedOnMessage,"Cannot call onMessage because no callback was set"),this.wrappedOnMessage(t);},qd);function qd(t){this.sendFn=t.sendFn,this.closeFn=t.closeFn;}var Vd="Connection",Bd={BatchGetDocuments:"batchGet",Commit:"commit"},Ud="gl-js/ fire/"+Lr,Kd=(Qd.prototype.modifyHeadersForRequest=function(t,e){if(e)for(var n in e.authHeaders)e.authHeaders.hasOwnProperty(n)&&(t[n]=e.authHeaders[n]);t["X-Goog-Api-Client"]=Ud;},Qd.prototype.invokeRPC=function(s,r,u){var c=this,h=this.makeUrl(s);return new Promise(function(i,o){var a=new _r;a.listenOnce(Rr.COMPLETE,function(){try{switch(a.getLastErrorCode()){case kr.NO_ERROR:var t=a.getResponseJson();Fr(Vd,"XHR received:",JSON.stringify(t)),i(t);break;case kr.TIMEOUT:Fr(Vd,'RPC "'+s+'" timed out'),o(new zr(Gr.DEADLINE_EXCEEDED,"Request time out"));break;case kr.HTTP_ERROR:var e=a.getStatus();if(Fr(Vd,'RPC "'+s+'" failed with status:',e,"response text:",a.getResponseText()),0<e){var n=a.getResponseJson().error;if(n&&n.status&&n.message){var r=function(t){var e=t.toLowerCase().replace("_","-");return 0<=Object.values(Gr).indexOf(e)?e:Gr.UNKNOWN}(n.status);o(new zr(r,n.message));}else o(new zr(Gr.UNKNOWN,"Server responded with status "+a.getStatus()));}else Fr(Vd,'RPC "'+s+'" failed'),o(new zr(Gr.UNAVAILABLE,"Connection failed."));break;default:Br('RPC "'+s+'" failed with unanticipated webchannel error '+a.getLastErrorCode()+": "+a.getLastError()+", giving up.");}}finally{Fr(Vd,'RPC "'+s+'" completed.');}});var t=l({},r);delete t.database;var e=JSON.stringify(t);Fr(Vd,"XHR sending: ",h+" "+e);var n={"Content-Type":"text/plain"};c.modifyHeadersForRequest(n,u),a.send(h,"POST",e,n,15);})},Qd.prototype.invokeStreamingRPC=function(t,e,n){return this.invokeRPC(t,e,n)},Qd.prototype.openStream=function(t,e){var n=[this.baseUrl,"/","google.firestore.v1.Firestore","/",t,"/channel"],r=Ar(),i={backgroundChannelTest:!0,httpSessionIdParam:"gsessionid",initMessageHeaders:{},messageUrlParams:{database:"projects/"+this.databaseId.projectId+"/databases/"+this.databaseId.database},sendRawJson:!0,supportsCrossDomainXhr:!0,internalChannelParams:{forwardChannelRequestTimeoutMs:6e5},forceLongPolling:this.forceLongPolling};this.modifyHeadersForRequest(i.initMessageHeaders,e),"object"==typeof navigator&&"ReactNative"===navigator.product||(i.httpHeadersOverwriteParam="$httpHeaders");var o=n.join("");function a(t,e){u.listen(t,function(t){try{e(t);}catch(t){setTimeout(function(){throw t},0);}});}Fr(Vd,"Creating WebChannel: "+o+" "+i);var u=r.createWebChannel(o,i),s=!1,c=!1,h=new Fd({sendFn:function(t){c?Fr(Vd,"Not sending because WebChannel is closed:",t):(s||(Fr(Vd,"Opening WebChannel transport."),u.open(),s=!0),Fr(Vd,"WebChannel sending:",t),u.send(t));},closeFn:function(){return u.close()}});return a(Mr.EventType.OPEN,function(){c||Fr(Vd,"WebChannel transport opened.");}),a(Mr.EventType.CLOSE,function(){c||(c=!0,Fr(Vd,"WebChannel transport closed"),h.callOnClose());}),a(Mr.EventType.ERROR,function(t){c||(c=!0,Fr(Vd,"WebChannel transport errored:",t),h.callOnClose(new zr(Gr.UNAVAILABLE,"The operation could not be completed")));}),a(Mr.EventType.MESSAGE,function(t){var e;if(!c){var n=t.data[0];Ur(!!n,"Got a webchannel message without data.");var r=n,i=r.error||(null===(e=r[0])||void 0===e?void 0:e.error);if(i){Fr(Vd,"WebChannel received error:",i);var o=i.status,a=function(t){var e=el[t];if(void 0!==e)return al(e)}(o),s=i.message;void 0===a&&(a=Gr.INTERNAL,s="Unknown error status: "+o+" with message "+i.message),c=!0,h.callOnClose(new zr(a,s)),u.close();}else Fr(Vd,"WebChannel received:",n),h.callOnMessage(n);}}),setTimeout(function(){h.callOnOpen();},0),h},Qd.prototype.makeUrl=function(t){var e=Bd[t];return Ur(void 0!==e,"Unknown REST mapping for: "+t),this.baseUrl+"/v1/projects/"+this.databaseId.projectId+"/databases/"+this.databaseId.database+"/documents:"+e},Qd);function Qd(t){this.databaseId=t.databaseId;var e=t.ssl?"https":"http";this.baseUrl=e+"://"+t.host,this.forceLongPolling=t.forceLongPolling;}var Wd=(Object.defineProperty(jd.prototype,"document",{get:function(){return "undefined"!=typeof document?document:null},enumerable:!0,configurable:!0}),Object.defineProperty(jd.prototype,"window",{get:function(){return "undefined"!=typeof window?window:null},enumerable:!0,configurable:!0}),jd.prototype.loadConnection=function(t){return Promise.resolve(new Kd(t))},jd.prototype.newConnectivityMonitor=function(){return Pd.isAvailable()?new Pd:new _d},jd.prototype.newSerializer=function(t){return new ef(t,{useProto3Json:!0})},jd.prototype.formatJSON=function(t){return JSON.stringify(t)},jd.prototype.atob=function(t){return atob(t)},jd.prototype.btoa=function(t){return btoa(t)},jd);function jd(){this.emptyByteString="",this.base64Available="undefined"!=typeof atob;}Kr.setPlatform(new Wd);var Gd;Md(Gd=zd),Gd.registerVersion("@firebase/firestore","1.9.0");}).apply(this,arguments);}catch(t){throw console.error(t),new Error("Cannot instantiate firebase-firestore - be sure to load firebase-app.js first.")}});

    });

    var firebaseAuth = createCommonjsModule(function (module, exports) {
    !function(t,e){e(index_cjs$2);}(commonjsGlobal,function(fl){try{(function(){fl=fl&&fl.hasOwnProperty("default")?fl.default:fl,function(){var t,o="function"==typeof Object.defineProperties?Object.defineProperty:function(t,e,n){t!=Array.prototype&&t!=Object.prototype&&(t[e]=n.value);},a="undefined"!=typeof window&&window===this?this:"undefined"!=typeof commonjsGlobal&&null!=commonjsGlobal?commonjsGlobal:this;function c(t){var e="undefined"!=typeof Symbol&&Symbol.iterator&&t[Symbol.iterator];return e?e.call(t):{next:function(t){var e=0;return function(){return e<t.length?{done:!1,value:t[e++]}:{done:!0}}}(t)}}!function(t,e){if(e){var n=a;t=t.split(".");for(var i=0;i<t.length-1;i++){var r=t[i];r in n||(n[r]={}),n=n[r];}(e=e(i=n[t=t[t.length-1]]))!=i&&null!=e&&o(n,t,{configurable:!0,writable:!0,value:e});}}("Promise",function(t){function s(t){this.b=0,this.c=void 0,this.a=[];var e=this.f();try{t(e.resolve,e.reject);}catch(t){e.reject(t);}}function e(){this.a=null;}function u(e){return e instanceof s?e:new s(function(t){t(e);})}if(t)return t;e.prototype.b=function(t){if(null==this.a){this.a=[];var e=this;this.c(function(){e.g();});}this.a.push(t);};var n=a.setTimeout;e.prototype.c=function(t){n(t,0);},e.prototype.g=function(){for(;this.a&&this.a.length;){var t=this.a;this.a=[];for(var e=0;e<t.length;++e){var n=t[e];t[e]=null;try{n();}catch(t){this.f(t);}}}this.a=null;},e.prototype.f=function(t){this.c(function(){throw t});},s.prototype.f=function(){function t(e){return function(t){i||(i=!0,e.call(n,t));}}var n=this,i=!1;return {resolve:t(this.m),reject:t(this.g)}},s.prototype.m=function(t){if(t===this)this.g(new TypeError("A Promise cannot resolve to itself"));else if(t instanceof s)this.o(t);else{t:switch(typeof t){case"object":var e=null!=t;break t;case"function":e=!0;break t;default:e=!1;}e?this.u(t):this.h(t);}},s.prototype.u=function(t){var e=void 0;try{e=t.then;}catch(t){return void this.g(t)}"function"==typeof e?this.v(e,t):this.h(t);},s.prototype.g=function(t){this.i(2,t);},s.prototype.h=function(t){this.i(1,t);},s.prototype.i=function(t,e){if(0!=this.b)throw Error("Cannot settle("+t+", "+e+"): Promise already settled in state"+this.b);this.b=t,this.c=e,this.l();},s.prototype.l=function(){if(null!=this.a){for(var t=0;t<this.a.length;++t)r.b(this.a[t]);this.a=null;}};var r=new e;return s.prototype.o=function(t){var e=this.f();t.La(e.resolve,e.reject);},s.prototype.v=function(t,e){var n=this.f();try{t.call(e,n.resolve,n.reject);}catch(t){n.reject(t);}},s.prototype.then=function(t,e){function n(e,t){return "function"==typeof e?function(t){try{i(e(t));}catch(t){r(t);}}:t}var i,r,o=new s(function(t,e){i=t,r=e;});return this.La(n(t,i),n(e,r)),o},s.prototype.catch=function(t){return this.then(void 0,t)},s.prototype.La=function(t,e){function n(){switch(i.b){case 1:t(i.c);break;case 2:e(i.c);break;default:throw Error("Unexpected state: "+i.b)}}var i=this;null==this.a?r.b(n):this.a.push(n);},s.resolve=u,s.reject=function(n){return new s(function(t,e){e(n);})},s.race=function(r){return new s(function(t,e){for(var n=c(r),i=n.next();!i.done;i=n.next())u(i.value).La(t,e);})},s.all=function(t){var o=c(t),a=o.next();return a.done?u([]):new s(function(n,t){function e(e){return function(t){i[e]=t,0==--r&&n(i);}}for(var i=[],r=0;i.push(void 0),r++,u(a.value).La(e(i.length-1),t),!(a=o.next()).done;);})},s});var u=u||{},l=this||self;function h(t){return "string"==typeof t}function n(t){return "boolean"==typeof t}var s=/^[\w+/_-]+[=]{0,2}$/,f=null;function d(){}function i(t){var e=typeof t;if("object"==e){if(!t)return "null";if(t instanceof Array)return "array";if(t instanceof Object)return e;var n=Object.prototype.toString.call(t);if("[object Window]"==n)return "object";if("[object Array]"==n||"number"==typeof t.length&&void 0!==t.splice&&void 0!==t.propertyIsEnumerable&&!t.propertyIsEnumerable("splice"))return "array";if("[object Function]"==n||void 0!==t.call&&void 0!==t.propertyIsEnumerable&&!t.propertyIsEnumerable("call"))return "function"}else if("function"==e&&void 0===t.call)return "object";return e}function r(t){return null===t}function p(t){return "array"==i(t)}function v(t){var e=i(t);return "array"==e||"object"==e&&"number"==typeof t.length}function m(t){return "function"==i(t)}function g(t){var e=typeof t;return "object"==e&&null!=t||"function"==e}var e="closure_uid_"+(1e9*Math.random()>>>0),b=0;function y(t,e,n){return t.call.apply(t.bind,arguments)}function w(e,n,t){if(!e)throw Error();if(2<arguments.length){var i=Array.prototype.slice.call(arguments,2);return function(){var t=Array.prototype.slice.call(arguments);return Array.prototype.unshift.apply(t,i),e.apply(n,t)}}return function(){return e.apply(n,arguments)}}function I(t,e,n){return (I=Function.prototype.bind&&-1!=Function.prototype.bind.toString().indexOf("native code")?y:w).apply(null,arguments)}function T(e,t){var n=Array.prototype.slice.call(arguments,1);return function(){var t=n.slice();return t.push.apply(t,arguments),e.apply(this,t)}}var E=Date.now||function(){return +new Date};function k(t,o){function e(){}e.prototype=o.prototype,t.qb=o.prototype,t.prototype=new e,(t.prototype.constructor=t).gd=function(t,e,n){for(var i=Array(arguments.length-2),r=2;r<arguments.length;r++)i[r-2]=arguments[r];return o.prototype[e].apply(t,i)};}function A(t){if(!t)return !1;try{return !!t.$goog_Thenable}catch(t){return !1}}function S(t){if(Error.captureStackTrace)Error.captureStackTrace(this,S);else{var e=Error().stack;e&&(this.stack=e);}t&&(this.message=String(t));}function N(t,e){for(var n="",i=(t=t.split("%s")).length-1,r=0;r<i;r++)n+=t[r]+(r<e.length?e[r]:"%s");S.call(this,n+t[i]);}function O(t,e){throw new N("Failure"+(t?": "+t:""),Array.prototype.slice.call(arguments,1))}function _(t,e){this.c=t,this.f=e,this.b=0,this.a=null;}function P(t,e){t.f(e),t.b<100&&(t.b++,e.next=t.a,t.a=e);}function R(){this.b=this.a=null;}k(S,Error),S.prototype.name="CustomError",k(N,S),N.prototype.name="AssertionError",_.prototype.get=function(){if(0<this.b){this.b--;var t=this.a;this.a=t.next,t.next=null;}else t=this.c();return t};var C=new _(function(){return new D},function(t){t.reset();});function D(){this.next=this.b=this.a=null;}function L(t,e){t:{try{var n=t&&t.ownerDocument,i=n&&(n.defaultView||n.parentWindow);if((i=i||l).Element&&i.Location){var r=i;break t}}catch(t){}r=null;}if(r&&void 0!==r[e]&&(!t||!(t instanceof r[e])&&(t instanceof r.Location||t instanceof r.Element))){if(g(t))try{var o=t.constructor.displayName||t.constructor.name||Object.prototype.toString.call(t);}catch(t){o="<object could not be stringified>";}else o=void 0===t?"undefined":null===t?"null":typeof t;O("Argument is not a %s (or a non-Element, non-Location mock); got: %s",e,o);}}R.prototype.add=function(t,e){var n=C.get();n.set(t,e),this.b?this.b.next=n:this.a=n,this.b=n;},D.prototype.set=function(t,e){this.a=t,this.b=e,this.next=null;},D.prototype.reset=function(){this.next=this.b=this.a=null;};var x=Array.prototype.indexOf?function(t,e){return Array.prototype.indexOf.call(t,e,void 0)}:function(t,e){if(h(t))return h(e)&&1==e.length?t.indexOf(e,0):-1;for(var n=0;n<t.length;n++)if(n in t&&t[n]===e)return n;return -1},M=Array.prototype.forEach?function(t,e,n){Array.prototype.forEach.call(t,e,n);}:function(t,e,n){for(var i=t.length,r=h(t)?t.split(""):t,o=0;o<i;o++)o in r&&e.call(n,r[o],o,t);};var j=Array.prototype.map?function(t,e){return Array.prototype.map.call(t,e,void 0)}:function(t,e){for(var n=t.length,i=Array(n),r=h(t)?t.split(""):t,o=0;o<n;o++)o in r&&(i[o]=e.call(void 0,r[o],o,t));return i},U=Array.prototype.some?function(t,e){return Array.prototype.some.call(t,e,void 0)}:function(t,e){for(var n=t.length,i=h(t)?t.split(""):t,r=0;r<n;r++)if(r in i&&e.call(void 0,i[r],r,t))return !0;return !1};function V(t,e){return 0<=x(t,e)}function F(t,e){var n;return (n=0<=(e=x(t,e)))&&Array.prototype.splice.call(t,e,1),n}function K(n,i){!function(t,e){for(var n=h(t)?t.split(""):t,i=t.length-1;0<=i;--i)i in n&&e.call(void 0,n[i],i,t);}(n,function(t,e){i.call(void 0,t,e,n)&&1==Array.prototype.splice.call(n,e,1).length&&0;});}function q(t){return Array.prototype.concat.apply([],arguments)}function H(t){var e=t.length;if(0<e){for(var n=Array(e),i=0;i<e;i++)n[i]=t[i];return n}return []}function B(t,e){for(var n in t)e.call(void 0,t[n],n,t);}function G(t){for(var e in t)return !1;return !0}function W(t){var e,n={};for(e in t)n[e]=t[e];return n}var X="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function J(t,e){for(var n,i,r=1;r<arguments.length;r++){for(n in i=arguments[r])t[n]=i[n];for(var o=0;o<X.length;o++)n=X[o],Object.prototype.hasOwnProperty.call(i,n)&&(t[n]=i[n]);}}function Y(t,e){this.a=t===Z&&e||"",this.b=$;}function z(t){return t instanceof Y&&t.constructor===Y&&t.b===$?t.a:(O("expected object of type Const, got '"+t+"'"),"type_error:Const")}Y.prototype.qa=!0,Y.prototype.pa=function(){return this.a},Y.prototype.toString=function(){return "Const{"+this.a+"}"};var $={},Z={},Q=new Y(Z,"");function tt(){this.a="",this.b=ot;}function et(t){return t instanceof tt&&t.constructor===tt&&t.b===ot?t.a:(O("expected object of type TrustedResourceUrl, got '"+t+"' of type "+i(t)),"type_error:TrustedResourceUrl")}function nt(t,n){var i=z(t);if(!rt.test(i))throw Error("Invalid TrustedResourceUrl format: "+i);return at(t=i.replace(it,function(t,e){if(!Object.prototype.hasOwnProperty.call(n,e))throw Error('Found marker, "'+e+'", in format string, "'+i+'", but no valid label mapping found in args: '+JSON.stringify(n));return (t=n[e])instanceof Y?z(t):encodeURIComponent(String(t))}))}tt.prototype.qa=!0,tt.prototype.pa=function(){return this.a.toString()},tt.prototype.toString=function(){return "TrustedResourceUrl{"+this.a+"}"};var it=/%{(\w+)}/g,rt=/^((https:)?\/\/[0-9a-z.:[\]-]+\/|\/[^/\\]|[^:/\\%]+\/|[^:/\\%]*[?#]|about:blank#)/i,ot={};function at(t){var e=new tt;return e.a=t,e}var st=String.prototype.trim?function(t){return t.trim()}:function(t){return /^[\s\xa0]*([\s\S]*?)[\s\xa0]*$/.exec(t)[1]},ut=/&/g,ct=/</g,ht=/>/g,lt=/"/g,ft=/'/g,dt=/\x00/g,pt=/[\x00&<>"']/;function vt(t,e){return -1!=t.indexOf(e)}function mt(t,e){return t<e?-1:e<t?1:0}function gt(){this.a="",this.b=Tt;}function bt(t){return t instanceof gt&&t.constructor===gt&&t.b===Tt?t.a:(O("expected object of type SafeUrl, got '"+t+"' of type "+i(t)),"type_error:SafeUrl")}gt.prototype.qa=!0,gt.prototype.pa=function(){return this.a.toString()},gt.prototype.toString=function(){return "SafeUrl{"+this.a+"}"};var yt=/^(?:(?:https?|mailto|ftp):|[^:/?#]*(?:[/?#]|$))/i;function wt(t){return t instanceof gt?t:(t="object"==typeof t&&t.qa?t.pa():String(t),yt.test(t)||(t="about:invalid#zClosurez"),Et(t))}var It,Tt={};function Et(t){var e=new gt;return e.a=t,e}Et("about:blank");t:{var kt=l.navigator;if(kt){var At=kt.userAgent;if(At){It=At;break t}}It="";}function St(t){return vt(It,t)}function Nt(){this.a="",this.b=_t;}function Ot(t){return t instanceof Nt&&t.constructor===Nt&&t.b===_t?t.a:(O("expected object of type SafeHtml, got '"+t+"' of type "+i(t)),"type_error:SafeHtml")}Nt.prototype.qa=!0,Nt.prototype.pa=function(){return this.a.toString()},Nt.prototype.toString=function(){return "SafeHtml{"+this.a+"}"};var _t={};function Pt(t){var e=new Nt;return e.a=t,e}Pt("<!DOCTYPE html>");var Rt,Ct,Dt=Pt("");function Lt(t,e){for(var n=t.split("%s"),i="",r=Array.prototype.slice.call(arguments,1);r.length&&1<n.length;)i+=n.shift()+r.shift();return i+n.join("%s")}function xt(t){return pt.test(t)&&(-1!=t.indexOf("&")&&(t=t.replace(ut,"&amp;")),-1!=t.indexOf("<")&&(t=t.replace(ct,"&lt;")),-1!=t.indexOf(">")&&(t=t.replace(ht,"&gt;")),-1!=t.indexOf('"')&&(t=t.replace(lt,"&quot;")),-1!=t.indexOf("'")&&(t=t.replace(ft,"&#39;")),-1!=t.indexOf("\0")&&(t=t.replace(dt,"&#0;"))),t}function Mt(t){l.setTimeout(function(){throw t},0);}function jt(){var t=l.MessageChannel;if(void 0===t&&"undefined"!=typeof window&&window.postMessage&&window.addEventListener&&!St("Presto")&&(t=function(){var t=document.createElement("IFRAME");t.style.display="none",function(t){var e=at(z(Q));L(t,"HTMLIFrameElement"),t.src=et(e).toString();}(t),document.documentElement.appendChild(t);var e=t.contentWindow;(t=e.document).open(),t.write(Ot(Dt)),t.close();var n="callImmediate"+Math.random(),i="file:"==e.location.protocol?"*":e.location.protocol+"//"+e.location.host;t=I(function(t){"*"!=i&&t.origin!=i||t.data!=n||this.port1.onmessage();},this),e.addEventListener("message",t,!1),this.port1={},this.port2={postMessage:function(){e.postMessage(n,i);}};}),void 0===t||St("Trident")||St("MSIE"))return "undefined"!=typeof document&&"onreadystatechange"in document.createElement("SCRIPT")?function(t){var e=document.createElement("SCRIPT");e.onreadystatechange=function(){e.onreadystatechange=null,e.parentNode.removeChild(e),e=null,t(),t=null;},document.documentElement.appendChild(e);}:function(t){l.setTimeout(t,0);};var e=new t,n={},i=n;return e.port1.onmessage=function(){if(void 0!==n.next){var t=(n=n.next).yb;n.yb=null,t();}},function(t){i.next={yb:t},i=i.next,e.port2.postMessage(0);}}function Ut(t,e){Ct||function(){if(l.Promise&&l.Promise.resolve){var t=l.Promise.resolve(void 0);Ct=function(){t.then(Kt);};}else Ct=function(){var t=Kt;!m(l.setImmediate)||l.Window&&l.Window.prototype&&!St("Edge")&&l.Window.prototype.setImmediate==l.setImmediate?(Rt=Rt||jt())(t):l.setImmediate(t);};}(),Vt||(Ct(),Vt=!0),Ft.add(t,e);}Pt("<br>");var Vt=!1,Ft=new R;function Kt(){for(var t;n=e=void 0,n=null,(e=Ft).a&&(n=e.a,e.a=e.a.next,e.a||(e.b=null),n.next=null),t=n;){try{t.a.call(t.b);}catch(t){Mt(t);}P(C,t);}var e,n;Vt=!1;}function qt(t,e){if(this.a=Ht,this.i=void 0,this.f=this.b=this.c=null,this.g=this.h=!1,t!=d)try{var n=this;t.call(e,function(t){ee(n,Bt,t);},function(t){if(!(t instanceof ue))try{if(t instanceof Error)throw t;throw Error("Promise rejected.")}catch(t){}ee(n,Gt,t);});}catch(t){ee(this,Gt,t);}}var Ht=0,Bt=2,Gt=3;function Wt(){this.next=this.f=this.b=this.g=this.a=null,this.c=!1;}Wt.prototype.reset=function(){this.f=this.b=this.g=this.a=null,this.c=!1;};var Xt=new _(function(){return new Wt},function(t){t.reset();});function Jt(t,e,n){var i=Xt.get();return i.g=t,i.b=e,i.f=n,i}function Yt(t){if(t instanceof qt)return t;var e=new qt(d);return ee(e,Bt,t),e}function zt(n){return new qt(function(t,e){e(n);})}function $t(t,e,n){ne(t,e,n,null)||Ut(T(e,t));}function Zt(n){return new qt(function(i){var r=n.length,o=[];if(r)for(var t=function(t,e,n){r--,o[t]=e?{Gb:!0,value:n}:{Gb:!1,reason:n},0==r&&i(o);},e=0;e<n.length;e++)$t(n[e],T(t,e,!0),T(t,e,!1));else i(o);})}function Qt(t,e){t.b||t.a!=Bt&&t.a!=Gt||ie(t),t.f?t.f.next=e:t.b=e,t.f=e;}function te(t,r,o,a){var e=Jt(null,null,null);return e.a=new qt(function(n,i){e.g=r?function(t){try{var e=r.call(a,t);n(e);}catch(t){i(t);}}:n,e.b=o?function(t){try{var e=o.call(a,t);void 0===e&&t instanceof ue?i(t):n(e);}catch(t){i(t);}}:i;}),Qt(e.a.c=t,e),e.a}function ee(t,e,n){t.a==Ht&&(t===n&&(e=Gt,n=new TypeError("Promise cannot resolve to itself")),t.a=1,ne(n,t.Oc,t.Pc,t)||(t.i=n,t.a=e,t.c=null,ie(t),e!=Gt||n instanceof ue||function(t,e){t.g=!0,Ut(function(){t.g&&se.call(null,e);});}(t,n)));}function ne(t,e,n,i){if(t instanceof qt)return Qt(t,Jt(e||d,n||null,i)),!0;if(A(t))return t.then(e,n,i),!0;if(g(t))try{var r=t.then;if(m(r))return function(t,e,n,i,r){function o(t){a||(a=!0,i.call(r,t));}var a=!1;try{e.call(t,function(t){a||(a=!0,n.call(r,t));},o);}catch(t){o(t);}}(t,r,e,n,i),!0}catch(t){return n.call(i,t),!0}return !1}function ie(t){t.h||(t.h=!0,Ut(t.Zb,t));}function re(t){var e=null;return t.b&&(e=t.b,t.b=e.next,e.next=null),t.b||(t.f=null),e}function oe(t,e,n,i){if(n==Gt&&e.b&&!e.c)for(;t&&t.g;t=t.c)t.g=!1;if(e.a)e.a.c=null,ae(e,n,i);else try{e.c?e.g.call(e.f):ae(e,n,i);}catch(t){se.call(null,t);}P(Xt,e);}function ae(t,e,n){e==Bt?t.g.call(t.f,n):t.b&&t.b.call(t.f,n);}qt.prototype.then=function(t,e,n){return te(this,m(t)?t:null,m(e)?e:null,n)},qt.prototype.$goog_Thenable=!0,(t=qt.prototype).ka=function(t,e){return (t=Jt(t,t,e)).c=!0,Qt(this,t),this},t.s=function(t,e){return te(this,null,t,e)},t.cancel=function(t){this.a==Ht&&Ut(function(){!function t(e,n){if(e.a==Ht)if(e.c){var i=e.c;if(i.b){for(var r=0,o=null,a=null,s=i.b;s&&(s.c||(r++,s.a==e&&(o=s),!(o&&1<r)));s=s.next)o||(a=s);o&&(i.a==Ht&&1==r?t(i,n):(a?((r=a).next==i.f&&(i.f=r),r.next=r.next.next):re(i),oe(i,o,Gt,n)));}e.c=null;}else ee(e,Gt,n);}(this,new ue(t));},this);},t.Oc=function(t){this.a=Ht,ee(this,Bt,t);},t.Pc=function(t){this.a=Ht,ee(this,Gt,t);},t.Zb=function(){for(var t;t=re(this);)oe(this,t,this.a,this.i);this.h=!1;};var se=Mt;function ue(t){S.call(this,t);}function ce(){this.va=this.va,this.la=this.la;}k(ue,S);var he=0;function le(t){if(!t.va&&(t.va=!0,t.za(),0!=he))t[e]||(t[e]=++b);}function fe(t){return fe[" "](t),t}ce.prototype.va=!(ue.prototype.name="cancel"),ce.prototype.za=function(){if(this.la)for(;this.la.length;)this.la.shift()();},fe[" "]=d;var de,pe,ve=St("Opera"),me=St("Trident")||St("MSIE"),ge=St("Edge"),be=ge||me,ye=St("Gecko")&&!(vt(It.toLowerCase(),"webkit")&&!St("Edge"))&&!(St("Trident")||St("MSIE"))&&!St("Edge"),we=vt(It.toLowerCase(),"webkit")&&!St("Edge");function Ie(){var t=l.document;return t?t.documentMode:void 0}t:{var Te="",Ee=(pe=It,ye?/rv:([^\);]+)(\)|;)/.exec(pe):ge?/Edge\/([\d\.]+)/.exec(pe):me?/\b(?:MSIE|rv)[: ]([^\);]+)(\)|;)/.exec(pe):we?/WebKit\/(\S+)/.exec(pe):ve?/(?:Version)[ \/]?(\S+)/.exec(pe):void 0);if(Ee&&(Te=Ee?Ee[1]:""),me){var ke=Ie();if(null!=ke&&ke>parseFloat(Te)){de=String(ke);break t}}de=Te;}var Ae,Se={};function Ne(s){return function(t,e){var n=Se;return Object.prototype.hasOwnProperty.call(n,t)?n[t]:n[t]=e(t)}(s,function(){for(var t=0,e=st(String(de)).split("."),n=st(String(s)).split("."),i=Math.max(e.length,n.length),r=0;0==t&&r<i;r++){var o=e[r]||"",a=n[r]||"";do{if(o=/(\d*)(\D*)(.*)/.exec(o)||["","","",""],a=/(\d*)(\D*)(.*)/.exec(a)||["","","",""],0==o[0].length&&0==a[0].length)break;t=mt(0==o[1].length?0:parseInt(o[1],10),0==a[1].length?0:parseInt(a[1],10))||mt(0==o[2].length,0==a[2].length)||mt(o[2],a[2]),o=o[3],a=a[3];}while(0==t)}return 0<=t})}Ae=l.document&&me?Ie():void 0;var Oe=Object.freeze||function(t){return t},_e=!me||9<=Number(Ae),Pe=me&&!Ne("9"),Re=function(){if(!l.addEventListener||!Object.defineProperty)return !1;var t=!1,e=Object.defineProperty({},"passive",{get:function(){t=!0;}});try{l.addEventListener("test",d,e),l.removeEventListener("test",d,e);}catch(t){}return t}();function Ce(t,e){this.type=t,this.b=this.target=e,this.Mb=!0;}function De(t,e){if(Ce.call(this,t?t.type:""),this.relatedTarget=this.b=this.target=null,this.button=this.screenY=this.screenX=this.clientY=this.clientX=0,this.key="",this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1,this.pointerId=0,this.pointerType="",this.a=null,t){var n=this.type=t.type,i=t.changedTouches&&t.changedTouches.length?t.changedTouches[0]:null;if(this.target=t.target||t.srcElement,this.b=e,e=t.relatedTarget){if(ye){t:{try{fe(e.nodeName);var r=!0;break t}catch(t){}r=!1;}r||(e=null);}}else"mouseover"==n?e=t.fromElement:"mouseout"==n&&(e=t.toElement);this.relatedTarget=e,i?(this.clientX=void 0!==i.clientX?i.clientX:i.pageX,this.clientY=void 0!==i.clientY?i.clientY:i.pageY,this.screenX=i.screenX||0,this.screenY=i.screenY||0):(this.clientX=void 0!==t.clientX?t.clientX:t.pageX,this.clientY=void 0!==t.clientY?t.clientY:t.pageY,this.screenX=t.screenX||0,this.screenY=t.screenY||0),this.button=t.button,this.key=t.key||"",this.ctrlKey=t.ctrlKey,this.altKey=t.altKey,this.shiftKey=t.shiftKey,this.metaKey=t.metaKey,this.pointerId=t.pointerId||0,this.pointerType=h(t.pointerType)?t.pointerType:Le[t.pointerType]||"",(this.a=t).defaultPrevented&&this.preventDefault();}}Ce.prototype.preventDefault=function(){this.Mb=!1;},k(De,Ce);var Le=Oe({2:"touch",3:"pen",4:"mouse"});De.prototype.preventDefault=function(){De.qb.preventDefault.call(this);var t=this.a;if(t.preventDefault)t.preventDefault();else if(t.returnValue=!1,Pe)try{(t.ctrlKey||112<=t.keyCode&&t.keyCode<=123)&&(t.keyCode=-1);}catch(t){}},De.prototype.f=function(){return this.a};var xe="closure_listenable_"+(1e6*Math.random()|0),Me=0;function je(t,e,n,i,r){this.listener=t,this.proxy=null,this.src=e,this.type=n,this.capture=!!i,this.Pa=r,this.key=++Me,this.ta=this.Ka=!1;}function Ue(t){t.ta=!0,t.listener=null,t.proxy=null,t.src=null,t.Pa=null;}function Ve(t){this.src=t,this.a={},this.b=0;}function Fe(t,e){var n=e.type;n in t.a&&F(t.a[n],e)&&(Ue(e),0==t.a[n].length&&(delete t.a[n],t.b--));}function Ke(t,e,n,i){for(var r=0;r<t.length;++r){var o=t[r];if(!o.ta&&o.listener==e&&o.capture==!!n&&o.Pa==i)return r}return -1}Ve.prototype.add=function(t,e,n,i,r){var o=t.toString();(t=this.a[o])||(t=this.a[o]=[],this.b++);var a=Ke(t,e,i,r);return -1<a?(e=t[a],n||(e.Ka=!1)):((e=new je(e,this.src,o,!!i,r)).Ka=n,t.push(e)),e};var qe="closure_lm_"+(1e6*Math.random()|0),He={};function Be(t,e,n,i,r){if(i&&i.once)We(t,e,n,i,r);else if(p(e))for(var o=0;o<e.length;o++)Be(t,e[o],n,i,r);else n=en(n),t&&t[xe]?rn(t,e,n,g(i)?!!i.capture:!!i,r):Ge(t,e,n,!1,i,r);}function Ge(t,e,n,i,r,o){if(!e)throw Error("Invalid event type");var a=g(r)?!!r.capture:!!r,s=Qe(t);if(s||(t[qe]=s=new Ve(t)),!(n=s.add(e,n,i,a,o)).proxy)if(i=function(){var e=Ze,n=_e?function(t){return e.call(n.src,n.listener,t)}:function(t){if(!(t=e.call(n.src,n.listener,t)))return t};return n}(),(n.proxy=i).src=t,i.listener=n,t.addEventListener)Re||(r=a),void 0===r&&(r=!1),t.addEventListener(e.toString(),i,r);else if(t.attachEvent)t.attachEvent(Ye(e.toString()),i);else{if(!t.addListener||!t.removeListener)throw Error("addEventListener and attachEvent are unavailable.");t.addListener(i);}}function We(t,e,n,i,r){if(p(e))for(var o=0;o<e.length;o++)We(t,e[o],n,i,r);else n=en(n),t&&t[xe]?on(t,e,n,g(i)?!!i.capture:!!i,r):Ge(t,e,n,!0,i,r);}function Xe(t,e,n,i,r){if(p(e))for(var o=0;o<e.length;o++)Xe(t,e[o],n,i,r);else i=g(i)?!!i.capture:!!i,n=en(n),t&&t[xe]?(t=t.u,(e=String(e).toString())in t.a&&(-1<(n=Ke(o=t.a[e],n,i,r))&&(Ue(o[n]),Array.prototype.splice.call(o,n,1),0==o.length&&(delete t.a[e],t.b--)))):(t=t&&Qe(t))&&(e=t.a[e.toString()],t=-1,e&&(t=Ke(e,n,i,r)),(n=-1<t?e[t]:null)&&Je(n));}function Je(t){if("number"!=typeof t&&t&&!t.ta){var e=t.src;if(e&&e[xe])Fe(e.u,t);else{var n=t.type,i=t.proxy;e.removeEventListener?e.removeEventListener(n,i,t.capture):e.detachEvent?e.detachEvent(Ye(n),i):e.addListener&&e.removeListener&&e.removeListener(i),(n=Qe(e))?(Fe(n,t),0==n.b&&(n.src=null,e[qe]=null)):Ue(t);}}}function Ye(t){return t in He?He[t]:He[t]="on"+t}function ze(t,e,n,i){var r=!0;if((t=Qe(t))&&(e=t.a[e.toString()]))for(e=e.concat(),t=0;t<e.length;t++){var o=e[t];o&&o.capture==n&&!o.ta&&(o=$e(o,i),r=r&&!1!==o);}return r}function $e(t,e){var n=t.listener,i=t.Pa||t.src;return t.Ka&&Je(t),n.call(i,e)}function Ze(t,e){if(t.ta)return !0;if(_e)return $e(t,new De(e,this));if(!e)t:{e=["window","event"];for(var n=l,i=0;i<e.length;i++)if(null==(n=n[e[i]])){e=null;break t}e=n;}if(e=new De(i=e,this),n=!0,!(i.keyCode<0||null!=i.returnValue)){t:{var r=!1;if(0==i.keyCode)try{i.keyCode=-1;break t}catch(t){r=!0;}!r&&null!=i.returnValue||(i.returnValue=!0);}for(i=[],r=e.b;r;r=r.parentNode)i.push(r);for(t=t.type,r=i.length-1;0<=r;r--){e.b=i[r];var o=ze(i[r],t,!0,e);n=n&&o;}for(r=0;r<i.length;r++)e.b=i[r],o=ze(i[r],t,!1,e),n=n&&o;}return n}function Qe(t){return (t=t[qe])instanceof Ve?t:null}var tn="__closure_events_fn_"+(1e9*Math.random()>>>0);function en(e){return m(e)?e:(e[tn]||(e[tn]=function(t){return e.handleEvent(t)}),e[tn])}function nn(){ce.call(this),this.u=new Ve(this),(this.Sb=this).Xa=null;}function rn(t,e,n,i,r){t.u.add(String(e),n,!1,i,r);}function on(t,e,n,i,r){t.u.add(String(e),n,!0,i,r);}function an(t,e,n,i){if(!(e=t.u.a[String(e)]))return !0;e=e.concat();for(var r=!0,o=0;o<e.length;++o){var a=e[o];if(a&&!a.ta&&a.capture==n){var s=a.listener,u=a.Pa||a.src;a.Ka&&Fe(t.u,a),r=!1!==s.call(u,i)&&r;}}return r&&0!=i.Mb}function sn(t,e,n){if(m(t))n&&(t=I(t,n));else{if(!t||"function"!=typeof t.handleEvent)throw Error("Invalid listener argument");t=I(t.handleEvent,t);}return 2147483647<Number(e)?-1:l.setTimeout(t,e||0)}function un(n){var i=null;return new qt(function(t,e){-1==(i=sn(function(){t(void 0);},n))&&e(Error("Failed to schedule timer."));}).s(function(t){throw l.clearTimeout(i),t})}function cn(t){if(t.U&&"function"==typeof t.U)return t.U();if(h(t))return t.split("");if(v(t)){for(var e=[],n=t.length,i=0;i<n;i++)e.push(t[i]);return e}for(i in e=[],n=0,t)e[n++]=t[i];return e}function hn(t){if(t.X&&"function"==typeof t.X)return t.X();if(!t.U||"function"!=typeof t.U){if(v(t)||h(t)){var e=[];t=t.length;for(var n=0;n<t;n++)e.push(n);return e}for(var i in e=[],n=0,t)e[n++]=i;return e}}function ln(t,e){this.b={},this.a=[],this.c=0;var n=arguments.length;if(1<n){if(n%2)throw Error("Uneven number of arguments");for(var i=0;i<n;i+=2)this.set(arguments[i],arguments[i+1]);}else if(t)if(t instanceof ln)for(n=t.X(),i=0;i<n.length;i++)this.set(n[i],t.get(n[i]));else for(i in t)this.set(i,t[i]);}function fn(t){if(t.c!=t.a.length){for(var e=0,n=0;e<t.a.length;){var i=t.a[e];dn(t.b,i)&&(t.a[n++]=i),e++;}t.a.length=n;}if(t.c!=t.a.length){var r={};for(n=e=0;e<t.a.length;)dn(r,i=t.a[e])||(r[t.a[n++]=i]=1),e++;t.a.length=n;}}function dn(t,e){return Object.prototype.hasOwnProperty.call(t,e)}k(nn,ce),nn.prototype[xe]=!0,nn.prototype.addEventListener=function(t,e,n,i){Be(this,t,e,n,i);},nn.prototype.removeEventListener=function(t,e,n,i){Xe(this,t,e,n,i);},nn.prototype.dispatchEvent=function(t){var e,n=this.Xa;if(n)for(e=[];n;n=n.Xa)e.push(n);n=this.Sb;var i=t.type||t;if(h(t))t=new Ce(t,n);else if(t instanceof Ce)t.target=t.target||n;else{var r=t;J(t=new Ce(i,n),r);}if(r=!0,e)for(var o=e.length-1;0<=o;o--){var a=t.b=e[o];r=an(a,i,!0,t)&&r;}if(r=an(a=t.b=n,i,!0,t)&&r,r=an(a,i,!1,t)&&r,e)for(o=0;o<e.length;o++)r=an(a=t.b=e[o],i,!1,t)&&r;return r},nn.prototype.za=function(){if(nn.qb.za.call(this),this.u){var t,e=this.u;for(t in e.a){for(var n=e.a[t],i=0;i<n.length;i++)Ue(n[i]);delete e.a[t],e.b--;}}this.Xa=null;},(t=ln.prototype).U=function(){fn(this);for(var t=[],e=0;e<this.a.length;e++)t.push(this.b[this.a[e]]);return t},t.X=function(){return fn(this),this.a.concat()},t.clear=function(){this.b={},this.c=this.a.length=0;},t.get=function(t,e){return dn(this.b,t)?this.b[t]:e},t.set=function(t,e){dn(this.b,t)||(this.c++,this.a.push(t)),this.b[t]=e;},t.forEach=function(t,e){for(var n=this.X(),i=0;i<n.length;i++){var r=n[i],o=this.get(r);t.call(e,o,r,this);}};var pn=/^(?:([^:/?#.]+):)?(?:\/\/(?:([^/?#]*)@)?([^/#?]*?)(?::([0-9]+))?(?=[/#?]|$))?([^?#]+)?(?:\?([^#]*))?(?:#([\s\S]*))?$/;function vn(t,e){var n;this.b=this.i=this.f="",this.l=null,this.g=this.c="",this.h=!1,t instanceof vn?(this.h=void 0!==e?e:t.h,mn(this,t.f),this.i=t.i,this.b=t.b,gn(this,t.l),this.c=t.c,bn(this,jn(t.a)),this.g=t.g):t&&(n=String(t).match(pn))?(this.h=!!e,mn(this,n[1]||"",!0),this.i=En(n[2]||""),this.b=En(n[3]||"",!0),gn(this,n[4]),this.c=En(n[5]||"",!0),bn(this,n[6]||"",!0),this.g=En(n[7]||"")):(this.h=!!e,this.a=new Rn(null,this.h));}function mn(t,e,n){t.f=n?En(e,!0):e,t.f&&(t.f=t.f.replace(/:$/,""));}function gn(t,e){if(e){if(e=Number(e),isNaN(e)||e<0)throw Error("Bad port number "+e);t.l=e;}else t.l=null;}function bn(t,e,n){e instanceof Rn?(t.a=e,function(t,e){e&&!t.f&&(Cn(t),t.c=null,t.a.forEach(function(t,e){var n=e.toLowerCase();e!=n&&(Ln(this,e),Mn(this,n,t));},t)),t.f=e;}(t.a,t.h)):(n||(e=kn(e,_n)),t.a=new Rn(e,t.h));}function yn(t,e,n){t.a.set(e,n);}function wn(t,e){return t.a.get(e)}function In(t){return t instanceof vn?new vn(t):new vn(t,void 0)}function Tn(t,e){var n=new vn(null,void 0);return mn(n,"https"),t&&(n.b=t),e&&(n.c=e),n}function En(t,e){return t?e?decodeURI(t.replace(/%25/g,"%2525")):decodeURIComponent(t):""}function kn(t,e,n){return h(t)?(t=encodeURI(t).replace(e,An),n&&(t=t.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),t):null}function An(t){return "%"+((t=t.charCodeAt(0))>>4&15).toString(16)+(15&t).toString(16)}vn.prototype.toString=function(){var t=[],e=this.f;e&&t.push(kn(e,Sn,!0),":");var n=this.b;return !n&&"file"!=e||(t.push("//"),(e=this.i)&&t.push(kn(e,Sn,!0),"@"),t.push(encodeURIComponent(String(n)).replace(/%25([0-9a-fA-F]{2})/g,"%$1")),null!=(n=this.l)&&t.push(":",String(n))),(n=this.c)&&(this.b&&"/"!=n.charAt(0)&&t.push("/"),t.push(kn(n,"/"==n.charAt(0)?On:Nn,!0))),(n=this.a.toString())&&t.push("?",n),(n=this.g)&&t.push("#",kn(n,Pn)),t.join("")},vn.prototype.resolve=function(t){var e=new vn(this),n=!!t.f;n?mn(e,t.f):n=!!t.i,n?e.i=t.i:n=!!t.b,n?e.b=t.b:n=null!=t.l;var i=t.c;if(n)gn(e,t.l);else if(n=!!t.c){if("/"!=i.charAt(0))if(this.b&&!this.c)i="/"+i;else{var r=e.c.lastIndexOf("/");-1!=r&&(i=e.c.substr(0,r+1)+i);}if(".."==(r=i)||"."==r)i="";else if(vt(r,"./")||vt(r,"/.")){i=0==r.lastIndexOf("/",0),r=r.split("/");for(var o=[],a=0;a<r.length;){var s=r[a++];"."==s?i&&a==r.length&&o.push(""):".."==s?((1<o.length||1==o.length&&""!=o[0])&&o.pop(),i&&a==r.length&&o.push("")):(o.push(s),i=!0);}i=o.join("/");}else i=r;}return n?e.c=i:n=""!==t.a.toString(),n?bn(e,jn(t.a)):n=!!t.g,n&&(e.g=t.g),e};var Sn=/[#\/\?@]/g,Nn=/[#\?:]/g,On=/[#\?]/g,_n=/[#\?@]/g,Pn=/#/g;function Rn(t,e){this.b=this.a=null,this.c=t||null,this.f=!!e;}function Cn(n){n.a||(n.a=new ln,n.b=0,n.c&&function(t,e){if(t){t=t.split("&");for(var n=0;n<t.length;n++){var i=t[n].indexOf("="),r=null;if(0<=i){var o=t[n].substring(0,i);r=t[n].substring(i+1);}else o=t[n];e(o,r?decodeURIComponent(r.replace(/\+/g," ")):"");}}}(n.c,function(t,e){n.add(decodeURIComponent(t.replace(/\+/g," ")),e);}));}function Dn(t){var e=hn(t);if(void 0===e)throw Error("Keys are undefined");var n=new Rn(null,void 0);t=cn(t);for(var i=0;i<e.length;i++){var r=e[i],o=t[i];p(o)?Mn(n,r,o):n.add(r,o);}return n}function Ln(t,e){Cn(t),e=Un(t,e),dn(t.a.b,e)&&(t.c=null,t.b-=t.a.get(e).length,dn((t=t.a).b,e)&&(delete t.b[e],t.c--,t.a.length>2*t.c&&fn(t)));}function xn(t,e){return Cn(t),e=Un(t,e),dn(t.a.b,e)}function Mn(t,e,n){Ln(t,e),0<n.length&&(t.c=null,t.a.set(Un(t,e),H(n)),t.b+=n.length);}function jn(t){var e=new Rn;return e.c=t.c,t.a&&(e.a=new ln(t.a),e.b=t.b),e}function Un(t,e){return e=String(e),t.f&&(e=e.toLowerCase()),e}(t=Rn.prototype).add=function(t,e){Cn(this),this.c=null,t=Un(this,t);var n=this.a.get(t);return n||this.a.set(t,n=[]),n.push(e),this.b+=1,this},t.clear=function(){this.a=this.c=null,this.b=0;},t.forEach=function(n,i){Cn(this),this.a.forEach(function(t,e){M(t,function(t){n.call(i,t,e,this);},this);},this);},t.X=function(){Cn(this);for(var t=this.a.U(),e=this.a.X(),n=[],i=0;i<e.length;i++)for(var r=t[i],o=0;o<r.length;o++)n.push(e[i]);return n},t.U=function(t){Cn(this);var e=[];if(h(t))xn(this,t)&&(e=q(e,this.a.get(Un(this,t))));else{t=this.a.U();for(var n=0;n<t.length;n++)e=q(e,t[n]);}return e},t.set=function(t,e){return Cn(this),this.c=null,xn(this,t=Un(this,t))&&(this.b-=this.a.get(t).length),this.a.set(t,[e]),this.b+=1,this},t.get=function(t,e){return t&&0<(t=this.U(t)).length?String(t[0]):e},t.toString=function(){if(this.c)return this.c;if(!this.a)return "";for(var t=[],e=this.a.X(),n=0;n<e.length;n++){var i=e[n],r=encodeURIComponent(String(i));i=this.U(i);for(var o=0;o<i.length;o++){var a=r;""!==i[o]&&(a+="="+encodeURIComponent(String(i[o]))),t.push(a);}}return this.c=t.join("&")};var Vn=!me||9<=Number(Ae);function Fn(t){var e=document;return h(t)?e.getElementById(t):t}function Kn(n,t){B(t,function(t,e){t&&"object"==typeof t&&t.qa&&(t=t.pa()),"style"==e?n.style.cssText=t:"class"==e?n.className=t:"for"==e?n.htmlFor=t:qn.hasOwnProperty(e)?n.setAttribute(qn[e],t):0==e.lastIndexOf("aria-",0)||0==e.lastIndexOf("data-",0)?n.setAttribute(e,t):n[e]=t;});}var qn={cellpadding:"cellPadding",cellspacing:"cellSpacing",colspan:"colSpan",frameborder:"frameBorder",height:"height",maxlength:"maxLength",nonce:"nonce",role:"role",rowspan:"rowSpan",type:"type",usemap:"useMap",valign:"vAlign",width:"width"};function Hn(t,e,n){var i=arguments,r=document,o=String(i[0]),a=i[1];if(!Vn&&a&&(a.name||a.type)){if(o=["<",o],a.name&&o.push(' name="',xt(a.name),'"'),a.type){o.push(' type="',xt(a.type),'"');var s={};J(s,a),delete s.type,a=s;}o.push(">"),o=o.join("");}return o=r.createElement(o),a&&(h(a)?o.className=a:p(a)?o.className=a.join(" "):Kn(o,a)),2<i.length&&function(e,n,t){function i(t){t&&n.appendChild(h(t)?e.createTextNode(t):t);}for(var r=2;r<t.length;r++){var o=t[r];!v(o)||g(o)&&0<o.nodeType?i(o):M(Bn(o)?H(o):o,i);}}(r,o,i),o}function Bn(t){if(t&&"number"==typeof t.length){if(g(t))return "function"==typeof t.item||"string"==typeof t.item;if(m(t))return "function"==typeof t.item}return !1}function Gn(t){var e=[];return function t(e,n,i){if(null==n)i.push("null");else{if("object"==typeof n){if(p(n)){var r=n;n=r.length,i.push("[");for(var o="",a=0;a<n;a++)i.push(o),t(e,r[a],i),o=",";return void i.push("]")}if(!(n instanceof String||n instanceof Number||n instanceof Boolean)){for(r in i.push("{"),o="",n)Object.prototype.hasOwnProperty.call(n,r)&&("function"!=typeof(a=n[r])&&(i.push(o),Yn(r,i),i.push(":"),t(e,a,i),o=","));return void i.push("}")}n=n.valueOf();}switch(typeof n){case"string":Yn(n,i);break;case"number":i.push(isFinite(n)&&!isNaN(n)?String(n):"null");break;case"boolean":i.push(String(n));break;case"function":i.push("null");break;default:throw Error("Unknown type: "+typeof n)}}}(new Wn,t,e),e.join("")}function Wn(){}var Xn={'"':'\\"',"\\":"\\\\","/":"\\/","\b":"\\b","\f":"\\f","\n":"\\n","\r":"\\r","\t":"\\t","\v":"\\u000b"},Jn=/\uffff/.test("￿")?/[\\"\x00-\x1f\x7f-\uffff]/g:/[\\"\x00-\x1f\x7f-\xff]/g;function Yn(t,e){e.push('"',t.replace(Jn,function(t){var e=Xn[t];return e||(e="\\u"+(65536|t.charCodeAt(0)).toString(16).substr(1),Xn[t]=e),e}),'"');}function zn(){var t=vi();return me&&!!Ae&&11==Ae||/Edge\/\d+/.test(t)}function $n(){return l.window&&l.window.location.href||self&&self.location&&self.location.href||""}function Zn(t,e){e=e||l.window;var n="about:blank";t&&(n=bt(wt(t)).toString()),e.location.href=n;}function Qn(t){return !!((t=(t||vi()).toLowerCase()).match(/android/)||t.match(/webos/)||t.match(/iphone|ipad|ipod/)||t.match(/blackberry/)||t.match(/windows phone/)||t.match(/iemobile/))}function ti(t){t=t||l.window;try{t.close();}catch(t){}}function ei(t,e,n){var i=Math.floor(1e9*Math.random()).toString();e=e||500,n=n||600;var r=(window.screen.availHeight-n)/2,o=(window.screen.availWidth-e)/2;for(a in e={width:e,height:n,top:0<r?r:0,left:0<o?o:0,location:!0,resizable:!0,statusbar:!0,toolbar:!1},n=vi().toLowerCase(),i&&(e.target=i,vt(n,"crios/")&&(e.target="_blank")),fi(vi())==hi&&(t=t||"http://localhost",e.scrollbars=!0),n=t||"",(t=e)||(t={}),i=window,e=n instanceof gt?n:wt(void 0!==n.href?n.href:String(n)),n=t.target||n.target,r=[],t)switch(a){case"width":case"height":case"top":case"left":r.push(a+"="+t[a]);break;case"target":case"noopener":case"noreferrer":break;default:r.push(a+"="+(t[a]?1:0));}var a=r.join(",");if((St("iPhone")&&!St("iPod")&&!St("iPad")||St("iPad")||St("iPod"))&&i.navigator&&i.navigator.standalone&&n&&"_self"!=n?(L(a=i.document.createElement("A"),"HTMLAnchorElement"),e instanceof gt||e instanceof gt||(e="object"==typeof e&&e.qa?e.pa():String(e),yt.test(e)||(e="about:invalid#zClosurez"),e=Et(e)),a.href=bt(e),a.setAttribute("target",n),t.noreferrer&&a.setAttribute("rel","noreferrer"),(t=document.createEvent("MouseEvent")).initMouseEvent("click",!0,!0,i,1),a.dispatchEvent(t),a={}):t.noreferrer?(a=i.open("",n,a),t=bt(e).toString(),a&&(be&&vt(t,";")&&(t="'"+t.replace(/'/g,"%27")+"'"),a.opener=null,t=Pt('<meta name="referrer" content="no-referrer"><meta http-equiv="refresh" content="0; url='+xt(t)+'">'),a.document.write(Ot(t)),a.document.close())):(a=i.open(bt(e).toString(),n,a))&&t.noopener&&(a.opener=null),a)try{a.focus();}catch(t){}return a}var ni=/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,ii=/^[^@]+@[^@]+$/;function ri(){var e=null;return new qt(function(t){"complete"==l.document.readyState?t():(e=function(){t();},We(window,"load",e));}).s(function(t){throw Xe(window,"load",e),t})}function oi(t){return t=t||vi(),!("file:"!==wi()&&"ionic:"!==wi()||!t.toLowerCase().match(/iphone|ipad|ipod|android/))}function ai(){var t=l.window;try{return !(!t||t==t.top)}catch(t){return !1}}function si(){return void 0!==l.WorkerGlobalScope&&"function"==typeof l.importScripts}function ui(){return fl.INTERNAL.hasOwnProperty("reactNative")?"ReactNative":fl.INTERNAL.hasOwnProperty("node")?"Node":si()?"Worker":"Browser"}function ci(){var t=ui();return "ReactNative"===t||"Node"===t}var hi="Firefox",li="Chrome";function fi(t){var e=t.toLowerCase();return vt(e,"opera/")||vt(e,"opr/")||vt(e,"opios/")?"Opera":vt(e,"iemobile")?"IEMobile":vt(e,"msie")||vt(e,"trident/")?"IE":vt(e,"edge/")?"Edge":vt(e,"firefox/")?hi:vt(e,"silk/")?"Silk":vt(e,"blackberry")?"Blackberry":vt(e,"webos")?"Webos":!vt(e,"safari/")||vt(e,"chrome/")||vt(e,"crios/")||vt(e,"android")?!vt(e,"chrome/")&&!vt(e,"crios/")||vt(e,"edge/")?vt(e,"android")?"Android":(t=t.match(/([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/))&&2==t.length?t[1]:"Other":li:"Safari"}var di={Wc:"FirebaseCore-web",Yc:"FirebaseUI-web"};function pi(t,e){e=e||[];var n,i=[],r={};for(n in di)r[di[n]]=!0;for(n=0;n<e.length;n++)void 0!==r[e[n]]&&(delete r[e[n]],i.push(e[n]));return i.sort(),(e=i).length||(e=["FirebaseCore-web"]),"Browser"===(i=ui())?i=fi(r=vi()):"Worker"===i&&(i=fi(r=vi())+"-"+i),i+"/JsCore/"+t+"/"+e.join(",")}function vi(){return l.navigator&&l.navigator.userAgent||""}function mi(t,e){t=t.split("."),e=e||l;for(var n=0;n<t.length&&"object"==typeof e&&null!=e;n++)e=e[t[n]];return n!=t.length&&(e=void 0),e}function gi(){try{var t=l.localStorage,e=Ai();if(t)return t.setItem(e,"1"),t.removeItem(e),!zn()||!!l.indexedDB}catch(t){return si()&&!!l.indexedDB}return !1}function bi(){return (yi()||"chrome-extension:"===wi()||oi())&&!ci()&&gi()&&!si()}function yi(){return "http:"===wi()||"https:"===wi()}function wi(){return l.location&&l.location.protocol||null}function Ii(t){return !Qn(t=t||vi())&&fi(t)!=hi}function Ti(t){return void 0===t?null:Gn(t)}function Ei(t){var e,n={};for(e in t)t.hasOwnProperty(e)&&null!==t[e]&&void 0!==t[e]&&(n[e]=t[e]);return n}function ki(t){if(null!==t)return JSON.parse(t)}function Ai(t){return t||Math.floor(1e9*Math.random()).toString()}function Si(t){return "Safari"!=fi(t=t||vi())&&!t.toLowerCase().match(/iphone|ipad|ipod/)}function Ni(){var t=l.___jsl;if(t&&t.H)for(var e in t.H)if(t.H[e].r=t.H[e].r||[],t.H[e].L=t.H[e].L||[],t.H[e].r=t.H[e].L.concat(),t.CP)for(var n=0;n<t.CP.length;n++)t.CP[n]=null;}function Oi(t,e){if(e<t)throw Error("Short delay should be less than long delay!");this.a=t,this.c=e,t=vi(),e=ui(),this.b=Qn(t)||"ReactNative"===e;}function _i(){var t=l.document;return !t||void 0===t.visibilityState||"visible"==t.visibilityState}function Pi(t){try{var e=new Date(parseInt(t,10));if(!isNaN(e.getTime())&&!/[^0-9]/.test(t))return e.toUTCString()}catch(t){}return null}function Ri(){return !(!mi("fireauth.oauthhelper",l)&&!mi("fireauth.iframe",l))}Oi.prototype.get=function(){var t=l.navigator;return !t||"boolean"!=typeof t.onLine||!yi()&&"chrome-extension:"!==wi()&&void 0===t.connection||t.onLine?this.b?this.c:this.a:Math.min(5e3,this.a)};var Ci,Di={};function Li(t){Di[t]||(Di[t]=!0,"undefined"!=typeof console&&"function"==typeof console.warn&&console.warn(t));}try{var xi={};Object.defineProperty(xi,"abcd",{configurable:!0,enumerable:!0,value:1}),Object.defineProperty(xi,"abcd",{configurable:!0,enumerable:!0,value:2}),Ci=2==xi.abcd;}catch(t){Ci=!1;}function Mi(t,e,n){Ci?Object.defineProperty(t,e,{configurable:!0,enumerable:!0,value:n}):t[e]=n;}function ji(t,e){if(e)for(var n in e)e.hasOwnProperty(n)&&Mi(t,n,e[n]);}function Ui(t){var e={};return ji(e,t),e}function Vi(t){var e=t;if("object"==typeof t&&null!=t)for(var n in e="length"in t?[]:{},t)Mi(e,n,Vi(t[n]));return e}function Fi(t){var e={},n=t[qi],i=t[Hi];if(!(t=t[Bi])||t!=Ki&&!n)throw Error("Invalid provider user info!");e[Wi]=i||null,e[Gi]=n||null,Mi(this,Ji,t),Mi(this,Xi,Vi(e));}var Ki="EMAIL_SIGNIN",qi="email",Hi="newEmail",Bi="requestType",Gi="email",Wi="fromEmail",Xi="data",Ji="operation";function Yi(t,e){this.code=$i+t,this.message=e||Zi[t]||"";}function zi(t){var e=t&&t.code;return e?new Yi(e.substring($i.length),t.message):null}k(Yi,Error),Yi.prototype.A=function(){return {code:this.code,message:this.message}},Yi.prototype.toJSON=function(){return this.A()};var $i="auth/",Zi={"admin-restricted-operation":"This operation is restricted to administrators only.","argument-error":"","app-not-authorized":"This app, identified by the domain where it's hosted, is not authorized to use Firebase Authentication with the provided API key. Review your key configuration in the Google API console.","app-not-installed":"The requested mobile application corresponding to the identifier (Android package name or iOS bundle ID) provided is not installed on this device.","captcha-check-failed":"The reCAPTCHA response token provided is either invalid, expired, already used or the domain associated with it does not match the list of whitelisted domains.","code-expired":"The SMS code has expired. Please re-send the verification code to try again.","cordova-not-ready":"Cordova framework is not ready.","cors-unsupported":"This browser is not supported.","credential-already-in-use":"This credential is already associated with a different user account.","custom-token-mismatch":"The custom token corresponds to a different audience.","requires-recent-login":"This operation is sensitive and requires recent authentication. Log in again before retrying this request.","dynamic-link-not-activated":"Please activate Dynamic Links in the Firebase Console and agree to the terms and conditions.","email-already-in-use":"The email address is already in use by another account.","expired-action-code":"The action code has expired. ","cancelled-popup-request":"This operation has been cancelled due to another conflicting popup being opened.","internal-error":"An internal error has occurred.","invalid-app-credential":"The phone verification request contains an invalid application verifier. The reCAPTCHA token response is either invalid or expired.","invalid-app-id":"The mobile app identifier is not registed for the current project.","invalid-user-token":"This user's credential isn't valid for this project. This can happen if the user's token has been tampered with, or if the user isn't for the project associated with this API key.","invalid-auth-event":"An internal error has occurred.","invalid-verification-code":"The SMS verification code used to create the phone auth credential is invalid. Please resend the verification code sms and be sure use the verification code provided by the user.","invalid-continue-uri":"The continue URL provided in the request is invalid.","invalid-cordova-configuration":"The following Cordova plugins must be installed to enable OAuth sign-in: cordova-plugin-buildinfo, cordova-universal-links-plugin, cordova-plugin-browsertab, cordova-plugin-inappbrowser and cordova-plugin-customurlscheme.","invalid-custom-token":"The custom token format is incorrect. Please check the documentation.","invalid-dynamic-link-domain":"The provided dynamic link domain is not configured or authorized for the current project.","invalid-email":"The email address is badly formatted.","invalid-api-key":"Your API key is invalid, please check you have copied it correctly.","invalid-cert-hash":"The SHA-1 certificate hash provided is invalid.","invalid-credential":"The supplied auth credential is malformed or has expired.","invalid-message-payload":"The email template corresponding to this action contains invalid characters in its message. Please fix by going to the Auth email templates section in the Firebase Console.","invalid-oauth-provider":"EmailAuthProvider is not supported for this operation. This operation only supports OAuth providers.","invalid-oauth-client-id":"The OAuth client ID provided is either invalid or does not match the specified API key.","unauthorized-domain":"This domain is not authorized for OAuth operations for your Firebase project. Edit the list of authorized domains from the Firebase console.","invalid-action-code":"The action code is invalid. This can happen if the code is malformed, expired, or has already been used.","wrong-password":"The password is invalid or the user does not have a password.","invalid-persistence-type":"The specified persistence type is invalid. It can only be local, session or none.","invalid-phone-number":"The format of the phone number provided is incorrect. Please enter the phone number in a format that can be parsed into E.164 format. E.164 phone numbers are written in the format [+][country code][subscriber number including area code].","invalid-provider-id":"The specified provider ID is invalid.","invalid-recipient-email":"The email corresponding to this action failed to send as the provided recipient email address is invalid.","invalid-sender":"The email template corresponding to this action contains an invalid sender email or name. Please fix by going to the Auth email templates section in the Firebase Console.","invalid-verification-id":"The verification ID used to create the phone auth credential is invalid.","invalid-tenant-id":"The Auth instance's tenant ID is invalid.","missing-android-pkg-name":"An Android Package Name must be provided if the Android App is required to be installed.","auth-domain-config-required":"Be sure to include authDomain when calling firebase.initializeApp(), by following the instructions in the Firebase console.","missing-app-credential":"The phone verification request is missing an application verifier assertion. A reCAPTCHA response token needs to be provided.","missing-verification-code":"The phone auth credential was created with an empty SMS verification code.","missing-continue-uri":"A continue URL must be provided in the request.","missing-iframe-start":"An internal error has occurred.","missing-ios-bundle-id":"An iOS Bundle ID must be provided if an App Store ID is provided.","missing-or-invalid-nonce":"The request does not contain a valid nonce. This can occur if the SHA-256 hash of the provided raw nonce does not match the hashed nonce in the ID token payload.","missing-phone-number":"To send verification codes, provide a phone number for the recipient.","missing-verification-id":"The phone auth credential was created with an empty verification ID.","app-deleted":"This instance of FirebaseApp has been deleted.","account-exists-with-different-credential":"An account already exists with the same email address but different sign-in credentials. Sign in using a provider associated with this email address.","network-request-failed":"A network error (such as timeout, interrupted connection or unreachable host) has occurred.","no-auth-event":"An internal error has occurred.","no-such-provider":"User was not linked to an account with the given provider.","null-user":"A null user object was provided as the argument for an operation which requires a non-null user object.","operation-not-allowed":"The given sign-in provider is disabled for this Firebase project. Enable it in the Firebase console, under the sign-in method tab of the Auth section.","operation-not-supported-in-this-environment":'This operation is not supported in the environment this application is running on. "location.protocol" must be http, https or chrome-extension and web storage must be enabled.',"popup-blocked":"Unable to establish a connection with the popup. It may have been blocked by the browser.","popup-closed-by-user":"The popup has been closed by the user before finalizing the operation.","provider-already-linked":"User can only be linked to one identity for the given provider.","quota-exceeded":"The project's quota for this operation has been exceeded.","redirect-cancelled-by-user":"The redirect operation has been cancelled by the user before finalizing.","redirect-operation-pending":"A redirect sign-in operation is already pending.","rejected-credential":"The request contains malformed or mismatching credentials.","tenant-id-mismatch":"The provided tenant ID does not match the Auth instance's tenant ID",timeout:"The operation has timed out.","user-token-expired":"The user's credential is no longer valid. The user must sign in again.","too-many-requests":"We have blocked all requests from this device due to unusual activity. Try again later.","unauthorized-continue-uri":"The domain of the continue URL is not whitelisted.  Please whitelist the domain in the Firebase console.","unsupported-persistence-type":"The current environment does not support the specified persistence type.","unsupported-tenant-operation":"This operation is not supported in a multi-tenant context.","user-cancelled":"The user did not grant your application the permissions it requested.","user-not-found":"There is no user record corresponding to this identifier. The user may have been deleted.","user-disabled":"The user account has been disabled by an administrator.","user-mismatch":"The supplied credentials do not correspond to the previously signed in user.","user-signed-out":"","weak-password":"The password must be 6 characters long or more.","web-storage-unsupported":"This browser is not supported or 3rd party cookies and data may be disabled."};function Qi(t){var e=wn(t=In(t),tr)||null,n=wn(t,er)||null,i=wn(t,rr)||null;if(i=i&&ar[i]||null,!e||!n||!i)throw new Yi("argument-error",tr+", "+er+"and "+rr+" are required in a valid action code URL.");ji(this,{apiKey:e,operation:i,code:n,continueUrl:wn(t,nr)||null,languageCode:wn(t,ir)||null,tenantId:wn(t,or)||null});}var tr="apiKey",er="oobCode",nr="continueUrl",ir="languageCode",rr="mode",or="tenantId",ar={recoverEmail:"RECOVER_EMAIL",resetPassword:"PASSWORD_RESET",signIn:Ki,verifyEmail:"VERIFY_EMAIL"};function sr(t){try{return new Qi(t)}catch(t){return null}}function ur(t){var e=t[dr];if(void 0===e)throw new Yi("missing-continue-uri");if("string"!=typeof e||"string"==typeof e&&!e.length)throw new Yi("invalid-continue-uri");this.h=e,this.b=this.a=null,this.g=!1;var n=t[cr];if(n&&"object"==typeof n){e=n[mr];var i=n[pr];if(n=n[vr],"string"==typeof e&&e.length){if(this.a=e,void 0!==i&&"boolean"!=typeof i)throw new Yi("argument-error",pr+" property must be a boolean when specified.");if(this.g=!!i,void 0!==n&&("string"!=typeof n||"string"==typeof n&&!n.length))throw new Yi("argument-error",vr+" property must be a non empty string when specified.");this.b=n||null;}else{if(void 0!==e)throw new Yi("argument-error",mr+" property must be a non empty string when specified.");if(void 0!==i||void 0!==n)throw new Yi("missing-android-pkg-name")}}else if(void 0!==n)throw new Yi("argument-error",cr+" property must be a non null object when specified.");if(this.f=null,(e=t[fr])&&"object"==typeof e){if("string"==typeof(e=e[gr])&&e.length)this.f=e;else if(void 0!==e)throw new Yi("argument-error",gr+" property must be a non empty string when specified.")}else if(void 0!==e)throw new Yi("argument-error",fr+" property must be a non null object when specified.");if(void 0!==(e=t[lr])&&"boolean"!=typeof e)throw new Yi("argument-error",lr+" property must be a boolean when specified.");if(this.c=!!e,void 0!==(t=t[hr])&&("string"!=typeof t||"string"==typeof t&&!t.length))throw new Yi("argument-error",hr+" property must be a non empty string when specified.");this.i=t||null;}var cr="android",hr="dynamicLinkDomain",lr="handleCodeInApp",fr="iOS",dr="url",pr="installApp",vr="minimumVersion",mr="packageName",gr="bundleId";function br(t){var e={};for(var n in e.continueUrl=t.h,e.canHandleCodeInApp=t.c,(e.androidPackageName=t.a)&&(e.androidMinimumVersion=t.b,e.androidInstallApp=t.g),e.iOSBundleId=t.f,e.dynamicLinkDomain=t.i,e)null===e[n]&&delete e[n];return e}var yr=null,wr=null;function Ir(t){var e="";return function(i,t){function e(t){for(;r<i.length;){var e=i.charAt(r++),n=wr[e];if(null!=n)return n;if(!/^[\s\xa0]*$/.test(e))throw Error("Unknown base64 encoding at char: "+e)}return t}!function(){if(!yr){yr={},wr={};for(var t=0;t<65;t++)yr[t]="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".charAt(t),62<=(wr[yr[t]]=t)&&(wr["ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.".charAt(t)]=t);}}();for(var r=0;;){var n=e(-1),o=e(0),a=e(64),s=e(64);if(64===s&&-1===n)break;t(n<<2|o>>4),64!=a&&(t(o<<4&240|a>>2),64!=s&&t(a<<6&192|s));}}(t,function(t){e+=String.fromCharCode(t);}),e}function Tr(t){this.f=t.sub,this.a=t.provider_id||t.firebase&&t.firebase.sign_in_provider||null,this.c=t.firebase&&t.firebase.tenant||null,this.b=!!t.is_anonymous||"anonymous"==this.a;}function Er(t){return (t=kr(t))&&t.sub&&t.iss&&t.aud&&t.exp?new Tr(t):null}function kr(t){if(!t)return null;if(3!=(t=t.split(".")).length)return null;for(var e=(4-(t=t[1]).length%4)%4,n=0;n<e;n++)t+=".";try{return JSON.parse(Ir(t))}catch(t){}return null}Tr.prototype.R=function(){return this.c},Tr.prototype.g=function(){return this.b};var Ar,Sr={bd:{cb:"https://www.googleapis.com/identitytoolkit/v3/relyingparty/",ib:"https://securetoken.googleapis.com/v1/token",id:"p"},dd:{cb:"https://staging-www.sandbox.googleapis.com/identitytoolkit/v3/relyingparty/",ib:"https://staging-securetoken.sandbox.googleapis.com/v1/token",id:"s"},ed:{cb:"https://www-googleapis-test.sandbox.google.com/identitytoolkit/v3/relyingparty/",ib:"https://test-securetoken.sandbox.googleapis.com/v1/token",id:"t"}};function Nr(t){for(var e in Sr)if(Sr[e].id===t)return {firebaseEndpoint:(t=Sr[e]).cb,secureTokenEndpoint:t.ib};return null}Ar=Nr("__EID__")?"__EID__":void 0;var Or="oauth_consumer_key oauth_nonce oauth_signature oauth_signature_method oauth_timestamp oauth_token oauth_version".split(" "),_r=["client_id","response_type","scope","redirect_uri","state"],Pr={Xc:{Ea:"locale",sa:700,ra:600,Fa:"facebook.com",Qa:_r},Zc:{Ea:null,sa:500,ra:750,Fa:"github.com",Qa:_r},$c:{Ea:"hl",sa:515,ra:680,Fa:"google.com",Qa:_r},fd:{Ea:"lang",sa:485,ra:705,Fa:"twitter.com",Qa:Or},Vc:{Ea:"locale",sa:600,ra:600,Fa:"apple.com",Qa:[]}};function Rr(t){for(var e in Pr)if(Pr[e].Fa==t)return Pr[e];return null}function Cr(t){var e={};e["facebook.com"]=jr,e["google.com"]=Vr,e["github.com"]=Ur,e["twitter.com"]=Fr;var n=t&&t[Lr];try{if(n)return e[n]?new e[n](t):new Mr(t);if(void 0!==t[Dr])return new xr(t)}catch(t){}return null}var Dr="idToken",Lr="providerId";function xr(t){var e=t[Lr];if(!e&&t[Dr]){var n=Er(t[Dr]);n&&n.a&&(e=n.a);}if(!e)throw Error("Invalid additional user info!");"anonymous"!=e&&"custom"!=e||(e=null),n=!1,void 0!==t.isNewUser?n=!!t.isNewUser:"identitytoolkit#SignupNewUserResponse"===t.kind&&(n=!0),Mi(this,"providerId",e),Mi(this,"isNewUser",n);}function Mr(t){xr.call(this,t),Mi(this,"profile",Vi((t=ki(t.rawUserInfo||"{}"))||{}));}function jr(t){if(Mr.call(this,t),"facebook.com"!=this.providerId)throw Error("Invalid provider ID!")}function Ur(t){if(Mr.call(this,t),"github.com"!=this.providerId)throw Error("Invalid provider ID!");Mi(this,"username",this.profile&&this.profile.login||null);}function Vr(t){if(Mr.call(this,t),"google.com"!=this.providerId)throw Error("Invalid provider ID!")}function Fr(t){if(Mr.call(this,t),"twitter.com"!=this.providerId)throw Error("Invalid provider ID!");Mi(this,"username",t.screenName||null);}function Kr(t){var e=In(t),n=wn(e,"link"),i=wn(In(n),"link");return wn(In(e=wn(e,"deep_link_id")),"link")||e||i||n||t}function qr(){}function Hr(t,n){return t.then(function(t){if(t[Ca]){var e=Er(t[Ca]);if(!e||n!=e.f)throw new Yi("user-mismatch");return t}throw new Yi("user-mismatch")}).s(function(t){throw t&&t.code&&t.code==$i+"user-not-found"?new Yi("user-mismatch"):t})}function Br(t,e){if(!e)throw new Yi("internal-error","failed to construct a credential");this.a=e,Mi(this,"providerId",t),Mi(this,"signInMethod",t);}function Gr(t){return {pendingToken:t.a,requestUri:"http://localhost"}}function Wr(t){if(t&&t.providerId&&t.signInMethod&&0==t.providerId.indexOf("saml.")&&t.pendingToken)try{return new Br(t.providerId,t.pendingToken)}catch(t){}return null}function Xr(t,e,n){if(this.a=null,e.idToken||e.accessToken)e.idToken&&Mi(this,"idToken",e.idToken),e.accessToken&&Mi(this,"accessToken",e.accessToken),e.nonce&&!e.pendingToken&&Mi(this,"nonce",e.nonce),e.pendingToken&&(this.a=e.pendingToken);else{if(!e.oauthToken||!e.oauthTokenSecret)throw new Yi("internal-error","failed to construct a credential");Mi(this,"accessToken",e.oauthToken),Mi(this,"secret",e.oauthTokenSecret);}Mi(this,"providerId",t),Mi(this,"signInMethod",n);}function Jr(t){var e={};return t.idToken&&(e.id_token=t.idToken),t.accessToken&&(e.access_token=t.accessToken),t.secret&&(e.oauth_token_secret=t.secret),e.providerId=t.providerId,t.nonce&&!t.a&&(e.nonce=t.nonce),e={postBody:Dn(e).toString(),requestUri:"http://localhost"},t.a&&(delete e.postBody,e.pendingToken=t.a),e}function Yr(t){if(t&&t.providerId&&t.signInMethod){var e={idToken:t.oauthIdToken,accessToken:t.oauthTokenSecret?null:t.oauthAccessToken,oauthTokenSecret:t.oauthTokenSecret,oauthToken:t.oauthTokenSecret&&t.oauthAccessToken,nonce:t.nonce,pendingToken:t.pendingToken};try{return new Xr(t.providerId,e,t.signInMethod)}catch(t){}}return null}function zr(t,e){this.Fc=e||[],ji(this,{providerId:t,isOAuthProvider:!0}),this.zb={},this.eb=(Rr(t)||{}).Ea||null,this.bb=null;}function $r(t){if("string"!=typeof t||0!=t.indexOf("saml."))throw new Yi("argument-error",'SAML provider IDs must be prefixed with "saml."');zr.call(this,t,[]);}function Zr(t){zr.call(this,t,_r),this.a=[];}function Qr(){Zr.call(this,"facebook.com");}function to(t){if(!t)throw new Yi("argument-error","credential failed: expected 1 argument (the OAuth access token).");var e=t;return g(t)&&(e=t.accessToken),(new Qr).credential({accessToken:e})}function eo(){Zr.call(this,"github.com");}function no(t){if(!t)throw new Yi("argument-error","credential failed: expected 1 argument (the OAuth access token).");var e=t;return g(t)&&(e=t.accessToken),(new eo).credential({accessToken:e})}function io(){Zr.call(this,"google.com"),this.ya("profile");}function ro(t,e){var n=t;return g(t)&&(n=t.idToken,e=t.accessToken),(new io).credential({idToken:n,accessToken:e})}function oo(){zr.call(this,"twitter.com",Or);}function ao(t,e){var n=t;if(g(n)||(n={oauthToken:t,oauthTokenSecret:e}),!n.oauthToken||!n.oauthTokenSecret)throw new Yi("argument-error","credential failed: expected 2 arguments (the OAuth access token and secret).");return new Xr("twitter.com",n,"twitter.com")}function so(t,e,n){this.a=t,this.c=e,Mi(this,"providerId","password"),Mi(this,"signInMethod",n===co.EMAIL_LINK_SIGN_IN_METHOD?co.EMAIL_LINK_SIGN_IN_METHOD:co.EMAIL_PASSWORD_SIGN_IN_METHOD);}function uo(t){return t&&t.email&&t.password?new so(t.email,t.password,t.signInMethod):null}function co(){ji(this,{providerId:"password",isOAuthProvider:!1});}function ho(t,e){if(!(e=lo(e)))throw new Yi("argument-error","Invalid email link!");return new so(t,e.code,co.EMAIL_LINK_SIGN_IN_METHOD)}function lo(t){return (t=sr(t=Kr(t)))&&t.operation===Ki?t:null}function fo(t){if(!(t.Va&&t.Ua||t.Ha&&t.ba))throw new Yi("internal-error");this.a=t,Mi(this,"providerId","phone"),Mi(this,"signInMethod","phone");}function po(e){if(e&&"phone"===e.providerId&&(e.verificationId&&e.verificationCode||e.temporaryProof&&e.phoneNumber)){var n={};return M(["verificationId","verificationCode","temporaryProof","phoneNumber"],function(t){e[t]&&(n[t]=e[t]);}),new fo(n)}return null}function vo(t){return t.a.Ha&&t.a.ba?{temporaryProof:t.a.Ha,phoneNumber:t.a.ba}:{sessionInfo:t.a.Va,code:t.a.Ua}}function mo(t){try{this.a=t||fl.auth();}catch(t){throw new Yi("argument-error","Either an instance of firebase.auth.Auth must be passed as an argument to the firebase.auth.PhoneAuthProvider constructor, or the default firebase App instance must be initialized via firebase.initializeApp().")}ji(this,{providerId:"phone",isOAuthProvider:!1});}function go(t,e){if(!t)throw new Yi("missing-verification-id");if(!e)throw new Yi("missing-verification-code");return new fo({Va:t,Ua:e})}function bo(t){if(t.temporaryProof&&t.phoneNumber)return new fo({Ha:t.temporaryProof,ba:t.phoneNumber});var e=t&&t.providerId;if(!e||"password"===e)return null;var n=t&&t.oauthAccessToken,i=t&&t.oauthTokenSecret,r=t&&t.nonce,o=t&&t.oauthIdToken,a=t&&t.pendingToken;try{switch(e){case"google.com":return ro(o,n);case"facebook.com":return to(n);case"github.com":return no(n);case"twitter.com":return ao(n,i);default:return n||i||o||a?a?0==e.indexOf("saml.")?new Br(e,a):new Xr(e,{pendingToken:a,idToken:t.oauthIdToken,accessToken:t.oauthAccessToken},e):new Zr(e).credential({idToken:o,accessToken:n,rawNonce:r}):null}}catch(t){return null}}function yo(t){if(!t.isOAuthProvider)throw new Yi("invalid-oauth-provider")}function wo(t,e,n,i,r,o,a){if(this.c=t,this.b=e||null,this.g=n||null,this.f=i||null,this.i=o||null,this.h=a||null,this.a=r||null,!this.g&&!this.a)throw new Yi("invalid-auth-event");if(this.g&&this.a)throw new Yi("invalid-auth-event");if(this.g&&!this.f)throw new Yi("invalid-auth-event")}function Io(t){return (t=t||{}).type?new wo(t.type,t.eventId,t.urlResponse,t.sessionId,t.error&&zi(t.error),t.postBody,t.tenantId):null}function To(){this.b=null,this.a=[];}k(Mr,xr),k(jr,Mr),k(Ur,Mr),k(Vr,Mr),k(Fr,Mr),Br.prototype.na=function(t){return za(t,Gr(this))},Br.prototype.b=function(t,e){var n=Gr(this);return n.idToken=e,$a(t,n)},Br.prototype.f=function(t,e){return Hr(Za(t,Gr(this)),e)},Br.prototype.A=function(){return {providerId:this.providerId,signInMethod:this.signInMethod,pendingToken:this.a}},Xr.prototype.na=function(t){return za(t,Jr(this))},Xr.prototype.b=function(t,e){var n=Jr(this);return n.idToken=e,$a(t,n)},Xr.prototype.f=function(t,e){return Hr(Za(t,Jr(this)),e)},Xr.prototype.A=function(){var t={providerId:this.providerId,signInMethod:this.signInMethod};return this.idToken&&(t.oauthIdToken=this.idToken),this.accessToken&&(t.oauthAccessToken=this.accessToken),this.secret&&(t.oauthTokenSecret=this.secret),this.nonce&&(t.nonce=this.nonce),this.a&&(t.pendingToken=this.a),t},zr.prototype.Ga=function(t){return this.zb=W(t),this},k($r,zr),k(Zr,zr),Zr.prototype.ya=function(t){return V(this.a,t)||this.a.push(t),this},Zr.prototype.Hb=function(){return H(this.a)},Zr.prototype.credential=function(t,e){var n;if(!(n=g(t)?{idToken:t.idToken||null,accessToken:t.accessToken||null,nonce:t.rawNonce||null}:{idToken:t||null,accessToken:e||null}).idToken&&!n.accessToken)throw new Yi("argument-error","credential failed: must provide the ID token and/or the access token.");return new Xr(this.providerId,n,this.providerId)},k(Qr,Zr),Mi(Qr,"PROVIDER_ID","facebook.com"),Mi(Qr,"FACEBOOK_SIGN_IN_METHOD","facebook.com"),k(eo,Zr),Mi(eo,"PROVIDER_ID","github.com"),Mi(eo,"GITHUB_SIGN_IN_METHOD","github.com"),k(io,Zr),Mi(io,"PROVIDER_ID","google.com"),Mi(io,"GOOGLE_SIGN_IN_METHOD","google.com"),k(oo,zr),Mi(oo,"PROVIDER_ID","twitter.com"),Mi(oo,"TWITTER_SIGN_IN_METHOD","twitter.com"),so.prototype.na=function(t){return this.signInMethod==co.EMAIL_LINK_SIGN_IN_METHOD?Ns(t,as,{email:this.a,oobCode:this.c}):Ns(t,Es,{email:this.a,password:this.c})},so.prototype.b=function(t,e){return this.signInMethod==co.EMAIL_LINK_SIGN_IN_METHOD?Ns(t,ss,{idToken:e,email:this.a,oobCode:this.c}):Ns(t,gs,{idToken:e,email:this.a,password:this.c})},so.prototype.f=function(t,e){return Hr(this.na(t),e)},so.prototype.A=function(){return {email:this.a,password:this.c,signInMethod:this.signInMethod}},ji(co,{PROVIDER_ID:"password"}),ji(co,{EMAIL_LINK_SIGN_IN_METHOD:"emailLink"}),ji(co,{EMAIL_PASSWORD_SIGN_IN_METHOD:"password"}),fo.prototype.na=function(t){return t.Wa(vo(this))},fo.prototype.b=function(t,e){var n=vo(this);return n.idToken=e,Ns(t,As,n)},fo.prototype.f=function(t,e){var n=vo(this);return n.operation="REAUTH",Hr(t=Ns(t,Ss,n),e)},fo.prototype.A=function(){var t={providerId:"phone"};return this.a.Va&&(t.verificationId=this.a.Va),this.a.Ua&&(t.verificationCode=this.a.Ua),this.a.Ha&&(t.temporaryProof=this.a.Ha),this.a.ba&&(t.phoneNumber=this.a.ba),t},mo.prototype.Wa=function(e,n){var i=this.a.b;return Yt(n.verify()).then(function(t){if(!h(t))throw new Yi("argument-error","An implementation of firebase.auth.ApplicationVerifier.prototype.verify() must return a firebase.Promise that resolves with a string.");switch(n.type){case"recaptcha":return function(t,e){return Ns(t,vs,e)}(i,{phoneNumber:e,recaptchaToken:t}).then(function(t){return "function"==typeof n.reset&&n.reset(),t},function(t){throw "function"==typeof n.reset&&n.reset(),t});default:throw new Yi("argument-error",'Only firebase.auth.ApplicationVerifiers with type="recaptcha" are currently supported.')}})},ji(mo,{PROVIDER_ID:"phone"}),ji(mo,{PHONE_SIGN_IN_METHOD:"phone"}),wo.prototype.getUid=function(){var t=[];return t.push(this.c),this.b&&t.push(this.b),this.f&&t.push(this.f),this.h&&t.push(this.h),t.join("-")},wo.prototype.R=function(){return this.h},wo.prototype.A=function(){return {type:this.c,eventId:this.b,urlResponse:this.g,sessionId:this.f,postBody:this.i,tenantId:this.h,error:this.a&&this.a.A()}};var Eo,ko=null;function Ao(t){var e="unauthorized-domain",n=void 0,i=In(t);t=i.b,"chrome-extension"==(i=i.f)?n=Lt("This chrome extension ID (chrome-extension://%s) is not authorized to run this operation. Add it to the OAuth redirect domains list in the Firebase console -> Auth section -> Sign in method tab.",t):"http"==i||"https"==i?n=Lt("This domain (%s) is not authorized to run this operation. Add it to the OAuth redirect domains list in the Firebase console -> Auth section -> Sign in method tab.",t):e="operation-not-supported-in-this-environment",Yi.call(this,e,n);}function So(t,e,n){Yi.call(this,t,n),(t=e||{}).Ab&&Mi(this,"email",t.Ab),t.ba&&Mi(this,"phoneNumber",t.ba),t.credential&&Mi(this,"credential",t.credential),t.Qb&&Mi(this,"tenantId",t.Qb);}function No(t){if(t.code){var e=t.code||"";0==e.indexOf($i)&&(e=e.substring($i.length));var n={credential:bo(t),Qb:t.tenantId};if(t.email)n.Ab=t.email;else if(t.phoneNumber)n.ba=t.phoneNumber;else if(!n.credential)return new Yi(e,t.message||void 0);return new So(e,n,t.message)}return null}function Oo(){}function _o(t){return t.c||(t.c=t.b())}function Po(){}function Ro(t){if(t.f||"undefined"!=typeof XMLHttpRequest||"undefined"==typeof ActiveXObject)return t.f;for(var e=["MSXML2.XMLHTTP.6.0","MSXML2.XMLHTTP.3.0","MSXML2.XMLHTTP","Microsoft.XMLHTTP"],n=0;n<e.length;n++){var i=e[n];try{return new ActiveXObject(i),t.f=i}catch(t){}}throw Error("Could not create ActiveXObject. ActiveX might be disabled, or MSXML might not be installed")}function Co(){}function Do(){this.a=new XDomainRequest,this.readyState=0,this.onreadystatechange=null,this.responseType=this.responseText=this.response="",this.status=-1,this.statusText="",this.a.onload=I(this.fc,this),this.a.onerror=I(this.Ib,this),this.a.onprogress=I(this.gc,this),this.a.ontimeout=I(this.kc,this);}function Lo(t,e){t.readyState=e,t.onreadystatechange&&t.onreadystatechange();}function xo(t,e,n){this.reset(t,e,n,void 0,void 0);}function Mo(t){this.f=t,this.b=this.c=this.a=null;}function jo(t,e){this.name=t,this.value=e;}k(Ao,Yi),k(So,Yi),So.prototype.A=function(){var t={code:this.code,message:this.message};this.email&&(t.email=this.email),this.phoneNumber&&(t.phoneNumber=this.phoneNumber),this.tenantId&&(t.tenantId=this.tenantId);var e=this.credential&&this.credential.A();return e&&J(t,e),t},So.prototype.toJSON=function(){return this.A()},Oo.prototype.c=null,k(Po,Oo),Po.prototype.a=function(){var t=Ro(this);return t?new ActiveXObject(t):new XMLHttpRequest},Po.prototype.b=function(){var t={};return Ro(this)&&(t[0]=!0,t[1]=!0),t},Eo=new Po,k(Co,Oo),Co.prototype.a=function(){var t=new XMLHttpRequest;if("withCredentials"in t)return t;if("undefined"!=typeof XDomainRequest)return new Do;throw Error("Unsupported browser")},Co.prototype.b=function(){return {}},(t=Do.prototype).open=function(t,e,n){if(null!=n&&!n)throw Error("Only async requests are supported.");this.a.open(t,e);},t.send=function(t){if(t){if("string"!=typeof t)throw Error("Only string data is supported");this.a.send(t);}else this.a.send();},t.abort=function(){this.a.abort();},t.setRequestHeader=function(){},t.getResponseHeader=function(t){return "content-type"==t.toLowerCase()?this.a.contentType:""},t.fc=function(){this.status=200,this.response=this.responseText=this.a.responseText,Lo(this,4);},t.Ib=function(){this.status=500,this.response=this.responseText="",Lo(this,4);},t.kc=function(){this.Ib();},t.gc=function(){this.status=200,Lo(this,1);},t.getAllResponseHeaders=function(){return "content-type: "+this.a.contentType},xo.prototype.a=null,xo.prototype.reset=function(t,e,n,i,r){delete this.a;},jo.prototype.toString=function(){return this.name};var Uo=new jo("SEVERE",1e3),Vo=new jo("WARNING",900),Fo=new jo("CONFIG",700),Ko=new jo("FINE",500);Mo.prototype.log=function(t,e,n){if(t.value>=function t(e){return e.c?e.c:e.a?t(e.a):(O("Root logger has no level set."),null)}(this).value)for(m(e)&&(e=e()),t=new xo(t,String(e),this.f),n&&(t.a=n),n=this;n;)n=n.a;};var qo,Ho={},Bo=null;function Go(t){var e;if(Bo||(Bo=new Mo(""),(Ho[""]=Bo).c=Fo),!(e=Ho[t])){e=new Mo(t);var n=t.lastIndexOf("."),i=t.substr(n+1);(n=Go(t.substr(0,n))).b||(n.b={}),(n.b[i]=e).a=n,Ho[t]=e;}return e}function Wo(t,e){t&&t.log(Ko,e,void 0);}function Xo(t){this.f=t;}function Jo(t){nn.call(this),this.o=t,this.readyState=Yo,this.status=0,this.responseType=this.responseText=this.response=this.statusText="",this.onreadystatechange=null,this.i=new Headers,this.b=null,this.m="GET",this.g="",this.a=!1,this.h=Go("goog.net.FetchXmlHttp"),this.l=this.c=this.f=null;}k(Xo,Oo),Xo.prototype.a=function(){return new Jo(this.f)},Xo.prototype.b=(qo={},function(){return qo}),k(Jo,nn);var Yo=0;function zo(t){t.c.read().then(t.ec.bind(t)).catch(t.Oa.bind(t));}function $o(t,e){e&&t.f&&(t.status=t.f.status,t.statusText=t.f.statusText),t.readyState=4,t.f=null,t.c=null,t.l=null,Zo(t);}function Zo(t){t.onreadystatechange&&t.onreadystatechange.call(t);}function Qo(t){nn.call(this),this.headers=new ln,this.B=t||null,this.c=!1,this.w=this.a=null,this.h=this.O=this.l="",this.f=this.J=this.i=this.I=!1,this.g=0,this.o=null,this.m=ta,this.v=this.P=!1;}(t=Jo.prototype).open=function(t,e){if(this.readyState!=Yo)throw this.abort(),Error("Error reopening a connection");this.m=t,this.g=e,this.readyState=1,Zo(this);},t.send=function(t){if(1!=this.readyState)throw this.abort(),Error("need to call open() first. ");this.a=!0;var e={headers:this.i,method:this.m,credentials:void 0,cache:void 0};t&&(e.body=t),this.o.fetch(new Request(this.g,e)).then(this.jc.bind(this),this.Oa.bind(this));},t.abort=function(){this.response=this.responseText="",this.i=new Headers,this.status=0,this.c&&this.c.cancel("Request was aborted."),1<=this.readyState&&this.a&&4!=this.readyState&&(this.a=!1,$o(this,!1)),this.readyState=Yo;},t.jc=function(t){this.a&&(this.f=t,this.b||(this.b=t.headers,this.readyState=2,Zo(this)),this.a&&(this.readyState=3,Zo(this),this.a&&("arraybuffer"===this.responseType?t.arrayBuffer().then(this.hc.bind(this),this.Oa.bind(this)):void 0!==l.ReadableStream&&"body"in t?(this.response=this.responseText="",this.c=t.body.getReader(),this.l=new TextDecoder,zo(this)):t.text().then(this.ic.bind(this),this.Oa.bind(this)))));},t.ec=function(t){if(this.a){var e=this.l.decode(t.value?t.value:new Uint8Array(0),{stream:!t.done});e&&(this.response=this.responseText+=e),t.done?$o(this,!0):Zo(this),3==this.readyState&&zo(this);}},t.ic=function(t){this.a&&(this.response=this.responseText=t,$o(this,!0));},t.hc=function(t){this.a&&(this.response=t,$o(this,!0));},t.Oa=function(t){var e=this.h;e&&e.log(Vo,"Failed to fetch url "+this.g,t instanceof Error?t:Error(t)),this.a&&$o(this,!0);},t.setRequestHeader=function(t,e){this.i.append(t,e);},t.getResponseHeader=function(t){return this.b?this.b.get(t.toLowerCase())||"":((t=this.h)&&t.log(Vo,"Attempting to get response header but no headers have been received for url: "+this.g,void 0),"")},t.getAllResponseHeaders=function(){if(!this.b){var t=this.h;return t&&t.log(Vo,"Attempting to get all response headers but no headers have been received for url: "+this.g,void 0),""}t=[];for(var e=this.b.entries(),n=e.next();!n.done;)n=n.value,t.push(n[0]+": "+n[1]),n=e.next();return t.join("\r\n")},k(Qo,nn);var ta="";Qo.prototype.b=Go("goog.net.XhrIo");var ea=/^https?$/i,na=["POST","PUT"];function ia(e,t,n,i,r){if(e.a)throw Error("[goog.net.XhrIo] Object is active with another request="+e.l+"; newUri="+t);n=n?n.toUpperCase():"GET",e.l=t,e.h="",e.O=n,e.I=!1,e.c=!0,e.a=e.B?e.B.a():Eo.a(),e.w=e.B?_o(e.B):_o(Eo),e.a.onreadystatechange=I(e.Lb,e);try{Wo(e.b,fa(e,"Opening Xhr")),e.J=!0,e.a.open(n,String(t),!0),e.J=!1;}catch(t){return Wo(e.b,fa(e,"Error opening Xhr: "+t.message)),void oa(e,t)}t=i||"";var o=new ln(e.headers);r&&function(t,e){if(t.forEach&&"function"==typeof t.forEach)t.forEach(e,void 0);else if(v(t)||h(t))M(t,e,void 0);else for(var n=hn(t),i=cn(t),r=i.length,o=0;o<r;o++)e.call(void 0,i[o],n&&n[o],t);}(r,function(t,e){o.set(e,t);}),r=function(t){t:{for(var e=ra,n=t.length,i=h(t)?t.split(""):t,r=0;r<n;r++)if(r in i&&e.call(void 0,i[r],r,t)){e=r;break t}e=-1;}return e<0?null:h(t)?t.charAt(e):t[e]}(o.X()),i=l.FormData&&t instanceof l.FormData,!V(na,n)||r||i||o.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8"),o.forEach(function(t,e){this.a.setRequestHeader(e,t);},e),e.m&&(e.a.responseType=e.m),"withCredentials"in e.a&&e.a.withCredentials!==e.P&&(e.a.withCredentials=e.P);try{ca(e),0<e.g&&(e.v=function(t){return me&&Ne(9)&&"number"==typeof t.timeout&&void 0!==t.ontimeout}(e.a),Wo(e.b,fa(e,"Will abort after "+e.g+"ms if incomplete, xhr2 "+e.v)),e.v?(e.a.timeout=e.g,e.a.ontimeout=I(e.Ia,e)):e.o=sn(e.Ia,e.g,e)),Wo(e.b,fa(e,"Sending request")),e.i=!0,e.a.send(t),e.i=!1;}catch(t){Wo(e.b,fa(e,"Send error: "+t.message)),oa(e,t);}}function ra(t){return "content-type"==t.toLowerCase()}function oa(t,e){t.c=!1,t.a&&(t.f=!0,t.a.abort(),t.f=!1),t.h=e,aa(t),ua(t);}function aa(t){t.I||(t.I=!0,t.dispatchEvent("complete"),t.dispatchEvent("error"));}function sa(e){if(e.c&&void 0!==u)if(e.w[1]&&4==ha(e)&&2==la(e))Wo(e.b,fa(e,"Local request error detected and ignored"));else if(e.i&&4==ha(e))sn(e.Lb,0,e);else if(e.dispatchEvent("readystatechange"),4==ha(e)){Wo(e.b,fa(e,"Request complete")),e.c=!1;try{var t,n=la(e);t:switch(n){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var i=!0;break t;default:i=!1;}if(!(t=i)){var r;if(r=0===n){var o=String(e.l).match(pn)[1]||null;if(!o&&l.self&&l.self.location){var a=l.self.location.protocol;o=a.substr(0,a.length-1);}r=!ea.test(o?o.toLowerCase():"");}t=r;}if(t)e.dispatchEvent("complete"),e.dispatchEvent("success");else{try{var s=2<ha(e)?e.a.statusText:"";}catch(t){Wo(e.b,"Can not get status: "+t.message),s="";}e.h=s+" ["+la(e)+"]",aa(e);}}finally{ua(e);}}}function ua(e,t){if(e.a){ca(e);var n=e.a,i=e.w[0]?d:null;e.a=null,e.w=null,t||e.dispatchEvent("ready");try{n.onreadystatechange=i;}catch(t){(e=e.b)&&e.log(Uo,"Problem encountered resetting onreadystatechange: "+t.message,void 0);}}}function ca(t){t.a&&t.v&&(t.a.ontimeout=null),t.o&&(l.clearTimeout(t.o),t.o=null);}function ha(t){return t.a?t.a.readyState:0}function la(t){try{return 2<ha(t)?t.a.status:-1}catch(t){return -1}}function fa(t,e){return e+" ["+t.O+" "+t.l+" "+la(t)+"]"}function da(t){var e=ka;this.g=[],this.v=e,this.o=t||null,this.f=this.a=!1,this.c=void 0,this.u=this.w=this.i=!1,this.h=0,this.b=null,this.l=0;}function pa(t,e,n){t.a=!0,t.c=n,t.f=!e,ba(t);}function va(t){if(t.a){if(!t.u)throw new ya(t);t.u=!1;}}function ma(t,e,n,i){t.g.push([e,n,i]),t.a&&ba(t);}function ga(t){return U(t.g,function(t){return m(t[1])})}function ba(e){if(e.h&&e.a&&ga(e)){var n=e.h,i=Ta[n];i&&(l.clearTimeout(i.a),delete Ta[n]),e.h=0;}e.b&&(e.b.l--,delete e.b),n=e.c;for(var t=i=!1;e.g.length&&!e.i;){var r=e.g.shift(),o=r[0],a=r[1];if(r=r[2],o=e.f?a:o)try{var s=o.call(r||e.o,n);void 0!==s&&(e.f=e.f&&(s==n||s instanceof Error),e.c=n=s),(A(n)||"function"==typeof l.Promise&&n instanceof l.Promise)&&(t=!0,e.i=!0);}catch(t){n=t,e.f=!0,ga(e)||(i=!0);}}e.c=n,t&&(s=I(e.m,e,!0),t=I(e.m,e,!1),n instanceof da?(ma(n,s,t),n.w=!0):n.then(s,t)),i&&(n=new Ia(n),Ta[n.a]=n,e.h=n.a);}function ya(){S.call(this);}function wa(){S.call(this);}function Ia(t){this.a=l.setTimeout(I(this.c,this),0),this.b=t;}(t=Qo.prototype).Ia=function(){void 0!==u&&this.a&&(this.h="Timed out after "+this.g+"ms, aborting",Wo(this.b,fa(this,this.h)),this.dispatchEvent("timeout"),this.abort(8));},t.abort=function(){this.a&&this.c&&(Wo(this.b,fa(this,"Aborting")),this.c=!1,this.f=!0,this.a.abort(),this.f=!1,this.dispatchEvent("complete"),this.dispatchEvent("abort"),ua(this));},t.za=function(){this.a&&(this.c&&(this.c=!1,this.f=!0,this.a.abort(),this.f=!1),ua(this,!0)),Qo.qb.za.call(this);},t.Lb=function(){this.va||(this.J||this.i||this.f?sa(this):this.yc());},t.yc=function(){sa(this);},t.getResponse=function(){try{if(!this.a)return null;if("response"in this.a)return this.a.response;switch(this.m){case ta:case"text":return this.a.responseText;case"arraybuffer":if("mozResponseArrayBuffer"in this.a)return this.a.mozResponseArrayBuffer}var t=this.b;return t&&t.log(Uo,"Response type "+this.m+" is not supported on this browser",void 0),null}catch(t){return Wo(this.b,"Can not get response: "+t.message),null}},da.prototype.cancel=function(t){if(this.a)this.c instanceof da&&this.c.cancel();else{if(this.b){var e=this.b;delete this.b,t?e.cancel(t):(e.l--,e.l<=0&&e.cancel());}this.v?this.v.call(this.o,this):this.u=!0,this.a||(t=new wa(this),va(this),pa(this,!1,t));}},da.prototype.m=function(t,e){this.i=!1,pa(this,t,e);},da.prototype.then=function(t,e,n){var i,r,o=new qt(function(t,e){i=t,r=e;});return ma(this,i,function(t){t instanceof wa?o.cancel():r(t);}),o.then(t,e,n)},da.prototype.$goog_Thenable=!0,k(ya,S),ya.prototype.message="Deferred has already fired",ya.prototype.name="AlreadyCalledError",k(wa,S),wa.prototype.message="Deferred was canceled",wa.prototype.name="CanceledError",Ia.prototype.c=function(){throw delete Ta[this.a],this.b};var Ta={};function Ea(t){var e,n=document,i=et(t).toString(),r=document.createElement("SCRIPT"),o={Nb:r,Ia:void 0},a=new da(o);return e=window.setTimeout(function(){Aa(r,!0);var t=new Oa(Na,"Timeout reached for loading script "+i);va(a),pa(a,!1,t);},5e3),o.Ia=e,r.onload=r.onreadystatechange=function(){r.readyState&&"loaded"!=r.readyState&&"complete"!=r.readyState||(Aa(r,!1,e),va(a),pa(a,!0,null));},r.onerror=function(){Aa(r,!0,e);var t=new Oa(Sa,"Error while loading script "+i);va(a),pa(a,!1,t);},J(o={},{type:"text/javascript",charset:"UTF-8"}),Kn(r,o),function(t,e){L(t,"HTMLScriptElement"),t.src=et(e),null===f&&(f=(e=(e=l.document).querySelector&&e.querySelector("script[nonce]"))&&(e=e.nonce||e.getAttribute("nonce"))&&s.test(e)?e:""),(e=f)&&t.setAttribute("nonce",e);}(r,t),function(t){var e;return (e=(t||document).getElementsByTagName("HEAD"))&&0!=e.length?e[0]:t.documentElement}(n).appendChild(r),a}function ka(){if(this&&this.Nb){var t=this.Nb;t&&"SCRIPT"==t.tagName&&Aa(t,!0,this.Ia);}}function Aa(t,e,n){null!=n&&l.clearTimeout(n),t.onload=d,t.onerror=d,t.onreadystatechange=d,e&&window.setTimeout(function(){t&&t.parentNode&&t.parentNode.removeChild(t);},0);}var Sa=0,Na=1;function Oa(t,e){var n="Jsloader error (code #"+t+")";e&&(n+=": "+e),S.call(this,n),this.code=t;}function _a(t){this.f=t;}function Pa(t,e,n){if(this.c=t,t=e||{},this.l=t.secureTokenEndpoint||"https://securetoken.googleapis.com/v1/token",this.u=t.secureTokenTimeout||Da,this.g=W(t.secureTokenHeaders||La),this.h=t.firebaseEndpoint||"https://www.googleapis.com/identitytoolkit/v3/relyingparty/",this.i=t.firebaseTimeout||xa,this.a=W(t.firebaseHeaders||Ma),n&&(this.a["X-Client-Version"]=n,this.g["X-Client-Version"]=n),n="Node"==ui(),!(n=l.XMLHttpRequest||n&&fl.INTERNAL.node&&fl.INTERNAL.node.XMLHttpRequest)&&!si())throw new Yi("internal-error","The XMLHttpRequest compatibility library was not found.");this.f=void 0,si()?this.f=new Xo(self):ci()?this.f=new _a(n):this.f=new Co,this.b=null;}k(Oa,S),k(_a,Oo),_a.prototype.a=function(){return new this.f},_a.prototype.b=function(){return {}};var Ra,Ca="idToken",Da=new Oi(3e4,6e4),La={"Content-Type":"application/x-www-form-urlencoded"},xa=new Oi(3e4,6e4),Ma={"Content-Type":"application/json"};function ja(t,e){e?t.a["X-Firebase-Locale"]=e:delete t.a["X-Firebase-Locale"];}function Ua(t,e){e?(t.a["X-Client-Version"]=e,t.g["X-Client-Version"]=e):(delete t.a["X-Client-Version"],delete t.g["X-Client-Version"]);}function Va(t,e,n,i,r,o,a){(t=function(){var t=vi();return !((t=fi(t)!=li?null:(t=t.match(/\sChrome\/(\d+)/i))&&2==t.length?parseInt(t[1],10):null)&&t<30)&&(!me||!Ae||9<Ae)}()||si()?I(t.o,t):(Ra=Ra||new qt(function(t,e){!function(t,e){if(((window.gapi||{}).client||{}).request)t();else{l[Ka]=function(){((window.gapi||{}).client||{}).request?t():e(Error("CORS_UNSUPPORTED"));},function(t,e){ma(t,null,e,void 0);}(Ea(nt(Fa,{onload:Ka})),function(){e(Error("CORS_UNSUPPORTED"));});}}(t,e);}),I(t.m,t)))(e,n,i,r,o,a);}Pa.prototype.R=function(){return this.b},Pa.prototype.o=function(t,n,e,i,r,o){if(si()&&(void 0===l.fetch||void 0===l.Headers||void 0===l.Request))throw new Yi("operation-not-supported-in-this-environment","fetch, Headers and Request native APIs or equivalent Polyfills must be available to support HTTP requests from a Worker environment.");var a=new Qo(this.f);if(o){a.g=Math.max(0,o);var s=setTimeout(function(){a.dispatchEvent("timeout");},o);}rn(a,"complete",function(){s&&clearTimeout(s);var e=null;try{e=JSON.parse(function(e){try{return e.a?e.a.responseText:""}catch(t){return Wo(e.b,"Can not get responseText: "+t.message),""}}(this))||null;}catch(t){e=null;}n&&n(e);}),on(a,"ready",function(){s&&clearTimeout(s),le(this);}),on(a,"timeout",function(){s&&clearTimeout(s),le(this),n&&n(null);}),ia(a,t,e,i,r);};var Fa=new Y(Z,"https://apis.google.com/js/client.js?onload=%{onload}"),Ka="__fcb"+Math.floor(1e6*Math.random()).toString();function qa(t){if(!h(t=t.email)||!ii.test(t))throw new Yi("invalid-email")}function Ha(t){"email"in t&&qa(t);}function Ba(t){if(!t[Ca])throw new Yi("internal-error")}function Ga(t){if(t.phoneNumber||t.temporaryProof){if(!t.phoneNumber||!t.temporaryProof)throw new Yi("internal-error")}else{if(!t.sessionInfo)throw new Yi("missing-verification-id");if(!t.code)throw new Yi("missing-verification-code")}}Pa.prototype.m=function(t,n,i,r,o){var a=this;Ra.then(function(){window.gapi.client.setApiKey(a.c);var e=window.gapi.auth.getToken();window.gapi.auth.setToken(null),window.gapi.client.request({path:t,method:i,body:r,headers:o,authType:"none",callback:function(t){window.gapi.auth.setToken(e),n&&n(t);}});}).s(function(t){n&&n({error:{message:t&&t.message||"CORS_UNSUPPORTED"}});});},Pa.prototype.ob=function(){return Ns(this,bs,{})},Pa.prototype.rb=function(t,e){return Ns(this,ms,{idToken:t,email:e})},Pa.prototype.sb=function(t,e){return Ns(this,gs,{idToken:t,password:e})};var Wa={displayName:"DISPLAY_NAME",photoUrl:"PHOTO_URL"};function Xa(t){if(!t.requestUri||!t.sessionId&&!t.postBody&&!t.pendingToken)throw new Yi("internal-error")}function Ja(t,e){return e.oauthIdToken&&e.providerId&&0==e.providerId.indexOf("oidc.")&&!e.pendingToken&&(t.sessionId?e.nonce=t.sessionId:t.postBody&&(xn(t=new Rn(t.postBody),"nonce")&&(e.nonce=t.get("nonce")))),e}function Ya(t){var e=null;if(t.needConfirmation?(t.code="account-exists-with-different-credential",e=No(t)):"FEDERATED_USER_ID_ALREADY_LINKED"==t.errorMessage?(t.code="credential-already-in-use",e=No(t)):"EMAIL_EXISTS"==t.errorMessage?(t.code="email-already-in-use",e=No(t)):t.errorMessage&&(e=Os(t.errorMessage)),e)throw e;if(!t[Ca])throw new Yi("internal-error")}function za(t,e){return e.returnIdpCredential=!0,Ns(t,ys,e)}function $a(t,e){return e.returnIdpCredential=!0,Ns(t,Is,e)}function Za(t,e){return e.returnIdpCredential=!0,e.autoCreate=!1,Ns(t,ws,e)}function Qa(t){if(!t.oobCode)throw new Yi("invalid-action-code")}(t=Pa.prototype).tb=function(t,i){var r={idToken:t},o=[];return B(Wa,function(t,e){var n=i[e];null===n?o.push(t):e in i&&(r[e]=n);}),o.length&&(r.deleteAttribute=o),Ns(this,ms,r)},t.kb=function(t,e){return J(t={requestType:"PASSWORD_RESET",email:t},e),Ns(this,ls,t)},t.lb=function(t,e){return J(t={requestType:"EMAIL_SIGNIN",email:t},e),Ns(this,cs,t)},t.jb=function(t,e){return J(t={requestType:"VERIFY_EMAIL",idToken:t},e),Ns(this,hs,t)},t.Wa=function(t){return Ns(this,ks,t)},t.ab=function(t,e){return Ns(this,ps,{oobCode:t,newPassword:e})},t.Ma=function(t){return Ns(this,es,{oobCode:t})},t.Ya=function(t){return Ns(this,ts,{oobCode:t})};var ts={endpoint:"setAccountInfo",D:Qa,fa:"email",F:!0},es={endpoint:"resetPassword",D:Qa,K:function(t){var e=t.requestType;if(!e||!t.email&&"EMAIL_SIGNIN"!=e)throw new Yi("internal-error")},F:!0},ns={endpoint:"signupNewUser",D:function(t){if(qa(t),!t.password)throw new Yi("weak-password")},K:Ba,T:!0,F:!0},is={endpoint:"createAuthUri",F:!0},rs={endpoint:"deleteAccount",V:["idToken"]},os={endpoint:"setAccountInfo",V:["idToken","deleteProvider"],D:function(t){if(!p(t.deleteProvider))throw new Yi("internal-error")}},as={endpoint:"emailLinkSignin",V:["email","oobCode"],D:qa,K:Ba,T:!0,F:!0},ss={endpoint:"emailLinkSignin",V:["idToken","email","oobCode"],D:qa,K:Ba,T:!0},us={endpoint:"getAccountInfo"},cs={endpoint:"getOobConfirmationCode",V:["requestType"],D:function(t){if("EMAIL_SIGNIN"!=t.requestType)throw new Yi("internal-error");qa(t);},fa:"email",F:!0},hs={endpoint:"getOobConfirmationCode",V:["idToken","requestType"],D:function(t){if("VERIFY_EMAIL"!=t.requestType)throw new Yi("internal-error")},fa:"email",F:!0},ls={endpoint:"getOobConfirmationCode",V:["requestType"],D:function(t){if("PASSWORD_RESET"!=t.requestType)throw new Yi("internal-error");qa(t);},fa:"email",F:!0},fs={wb:!0,endpoint:"getProjectConfig",Kb:"GET"},ds={wb:!0,endpoint:"getRecaptchaParam",Kb:"GET",K:function(t){if(!t.recaptchaSiteKey)throw new Yi("internal-error")}},ps={endpoint:"resetPassword",D:Qa,fa:"email",F:!0},vs={endpoint:"sendVerificationCode",V:["phoneNumber","recaptchaToken"],fa:"sessionInfo",F:!0},ms={endpoint:"setAccountInfo",V:["idToken"],D:Ha,T:!0},gs={endpoint:"setAccountInfo",V:["idToken"],D:function(t){if(Ha(t),!t.password)throw new Yi("weak-password")},K:Ba,T:!0},bs={endpoint:"signupNewUser",K:Ba,T:!0,F:!0},ys={endpoint:"verifyAssertion",D:Xa,Ra:Ja,K:Ya,T:!0,F:!0},ws={endpoint:"verifyAssertion",D:Xa,Ra:Ja,K:function(t){if(t.errorMessage&&"USER_NOT_FOUND"==t.errorMessage)throw new Yi("user-not-found");if(t.errorMessage)throw Os(t.errorMessage);if(!t[Ca])throw new Yi("internal-error")},T:!0,F:!0},Is={endpoint:"verifyAssertion",D:function(t){if(Xa(t),!t.idToken)throw new Yi("internal-error")},Ra:Ja,K:Ya,T:!0},Ts={endpoint:"verifyCustomToken",D:function(t){if(!t.token)throw new Yi("invalid-custom-token")},K:Ba,T:!0,F:!0},Es={endpoint:"verifyPassword",D:function(t){if(qa(t),!t.password)throw new Yi("wrong-password")},K:Ba,T:!0,F:!0},ks={endpoint:"verifyPhoneNumber",D:Ga,K:Ba,F:!0},As={endpoint:"verifyPhoneNumber",D:function(t){if(!t.idToken)throw new Yi("internal-error");Ga(t);},K:function(t){if(t.temporaryProof)throw t.code="credential-already-in-use",No(t);Ba(t);}},Ss={Yb:{USER_NOT_FOUND:"user-not-found"},endpoint:"verifyPhoneNumber",D:Ga,K:Ba,F:!0};function Ns(t,e,n){if(!function(t,e){if(!e||!e.length)return !0;if(!t)return !1;for(var n=0;n<e.length;n++){var i=t[e[n]];if(null==i||""===i)return !1}return !0}(n,e.V))return zt(new Yi("internal-error"));var i,r=e.Kb||"POST";return Yt(n).then(e.D).then(function(){return e.T&&(n.returnSecureToken=!0),e.F&&t.b&&void 0===n.tenantId&&(n.tenantId=t.b),function(t,e,i,r,o,n){var a=In(t.h+e);yn(a,"key",t.c),n&&yn(a,"cb",E().toString());var s="GET"==i;if(s)for(var u in r)r.hasOwnProperty(u)&&yn(a,u,r[u]);return new qt(function(e,n){Va(t,a.toString(),function(t){t?t.error?n(_s(t,o||{})):e(t):n(new Yi("network-request-failed"));},i,s?void 0:Gn(Ei(r)),t.a,t.i.get());})}(t,e.endpoint,r,n,e.Yb,e.wb||!1)}).then(function(t){return i=t,e.Ra?e.Ra(n,i):i}).then(e.K).then(function(){if(!e.fa)return i;if(!(e.fa in i))throw new Yi("internal-error");return i[e.fa]})}function Os(t){return _s({error:{errors:[{message:t}],code:400,message:t}})}function _s(t,e){var n=(t.error&&t.error.errors&&t.error.errors[0]||{}).reason||"",i={keyInvalid:"invalid-api-key",ipRefererBlocked:"app-not-authorized"};if(n=i[n]?new Yi(i[n]):null)return n;for(var r in n=t.error&&t.error.message||"",J(i={INVALID_CUSTOM_TOKEN:"invalid-custom-token",CREDENTIAL_MISMATCH:"custom-token-mismatch",MISSING_CUSTOM_TOKEN:"internal-error",INVALID_IDENTIFIER:"invalid-email",MISSING_CONTINUE_URI:"internal-error",INVALID_EMAIL:"invalid-email",INVALID_PASSWORD:"wrong-password",USER_DISABLED:"user-disabled",MISSING_PASSWORD:"internal-error",EMAIL_EXISTS:"email-already-in-use",PASSWORD_LOGIN_DISABLED:"operation-not-allowed",INVALID_IDP_RESPONSE:"invalid-credential",INVALID_PENDING_TOKEN:"invalid-credential",FEDERATED_USER_ID_ALREADY_LINKED:"credential-already-in-use",MISSING_OR_INVALID_NONCE:"missing-or-invalid-nonce",INVALID_MESSAGE_PAYLOAD:"invalid-message-payload",INVALID_RECIPIENT_EMAIL:"invalid-recipient-email",INVALID_SENDER:"invalid-sender",EMAIL_NOT_FOUND:"user-not-found",RESET_PASSWORD_EXCEED_LIMIT:"too-many-requests",EXPIRED_OOB_CODE:"expired-action-code",INVALID_OOB_CODE:"invalid-action-code",MISSING_OOB_CODE:"internal-error",INVALID_PROVIDER_ID:"invalid-provider-id",CREDENTIAL_TOO_OLD_LOGIN_AGAIN:"requires-recent-login",INVALID_ID_TOKEN:"invalid-user-token",TOKEN_EXPIRED:"user-token-expired",USER_NOT_FOUND:"user-token-expired",CORS_UNSUPPORTED:"cors-unsupported",DYNAMIC_LINK_NOT_ACTIVATED:"dynamic-link-not-activated",INVALID_APP_ID:"invalid-app-id",TOO_MANY_ATTEMPTS_TRY_LATER:"too-many-requests",WEAK_PASSWORD:"weak-password",OPERATION_NOT_ALLOWED:"operation-not-allowed",USER_CANCELLED:"user-cancelled",CAPTCHA_CHECK_FAILED:"captcha-check-failed",INVALID_APP_CREDENTIAL:"invalid-app-credential",INVALID_CODE:"invalid-verification-code",INVALID_PHONE_NUMBER:"invalid-phone-number",INVALID_SESSION_INFO:"invalid-verification-id",INVALID_TEMPORARY_PROOF:"invalid-credential",MISSING_APP_CREDENTIAL:"missing-app-credential",MISSING_CODE:"missing-verification-code",MISSING_PHONE_NUMBER:"missing-phone-number",MISSING_SESSION_INFO:"missing-verification-id",QUOTA_EXCEEDED:"quota-exceeded",SESSION_EXPIRED:"code-expired",REJECTED_CREDENTIAL:"rejected-credential",INVALID_CONTINUE_URI:"invalid-continue-uri",MISSING_ANDROID_PACKAGE_NAME:"missing-android-pkg-name",MISSING_IOS_BUNDLE_ID:"missing-ios-bundle-id",UNAUTHORIZED_DOMAIN:"unauthorized-continue-uri",INVALID_DYNAMIC_LINK_DOMAIN:"invalid-dynamic-link-domain",INVALID_OAUTH_CLIENT_ID:"invalid-oauth-client-id",INVALID_CERT_HASH:"invalid-cert-hash",UNSUPPORTED_TENANT_OPERATION:"unsupported-tenant-operation",INVALID_TENANT_ID:"invalid-tenant-id",TENANT_ID_MISMATCH:"tenant-id-mismatch",ADMIN_ONLY_OPERATION:"admin-restricted-operation"},e||{}),e=(e=n.match(/^[^\s]+\s*:\s*([\s\S]*)$/))&&1<e.length?e[1]:void 0,i)if(0===n.indexOf(r))return new Yi(i[r],e);return !e&&t&&(e=Ti(t)),new Yi("internal-error",e)}function Ps(t){this.b=t,this.a=null,this.gb=function(o){return (Ls=Ls||new qt(function(t,e){function n(){Ni(),mi("gapi.load")("gapi.iframes",{callback:t,ontimeout:function(){Ni(),e(Error("Network Error"));},timeout:Cs.get()});}if(mi("gapi.iframes.Iframe"))t();else if(mi("gapi.load"))n();else{var i="__iframefcb"+Math.floor(1e6*Math.random()).toString();l[i]=function(){mi("gapi.load")?n():e(Error("Network Error"));},Yt(Ea(i=nt(Rs,{onload:i}))).s(function(){e(Error("Network Error"));});}}).s(function(t){throw Ls=null,t})).then(function(){return new qt(function(i,r){mi("gapi.iframes.getContext")().open({where:document.body,url:o.b,messageHandlersFilter:mi("gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER"),attributes:{style:{position:"absolute",top:"-100px",width:"1px",height:"1px"}},dontclear:!0},function(t){function e(){clearTimeout(n),i();}o.a=t,o.a.restyle({setHideOnLeave:!1});var n=setTimeout(function(){r(Error("Network Error"));},Ds.get());t.ping(e).then(e,function(){r(Error("Network Error"));});});})})}(this);}var Rs=new Y(Z,"https://apis.google.com/js/api.js?onload=%{onload}"),Cs=new Oi(3e4,6e4),Ds=new Oi(5e3,15e3),Ls=null;function xs(t,e,n){this.i=t,this.g=e,this.h=n,this.f=null,this.a=Tn(this.i,"/__/auth/iframe"),yn(this.a,"apiKey",this.g),yn(this.a,"appName",this.h),this.b=null,this.c=[];}function Ms(t,e,n,i,r){this.o=t,this.m=e,this.c=n,this.u=i,this.i=this.g=this.l=null,this.a=r,this.h=this.f=null;}function js(t){try{return fl.app(t).auth().Ca()}catch(t){return []}}function Us(t,e,n,i,r){this.u=t,this.f=e,this.b=n,this.c=i||null,this.h=r||null,this.m=this.o=this.v=null,this.g=[],this.l=this.a=null;}function Vs(t){var s=$n();return function(t){return Ns(t,fs,{}).then(function(t){return t.authorizedDomains||[]})}(t).then(function(t){t:{var e=In(s),n=e.f;e=e.b;for(var i=0;i<t.length;i++){var r=t[i],o=e,a=n;if(o=0==r.indexOf("chrome-extension://")?In(r).b==o&&"chrome-extension"==a:("http"==a||"https"==a)&&(ni.test(r)?o==r:(r=r.split(".").join("\\."),new RegExp("^(.+\\."+r+"|"+r+")$","i").test(o)))){t=!0;break t}}t=!1;}if(!t)throw new Ao($n())})}function Fs(r){return r.l||(r.l=ri().then(function(){if(!r.o){var t=r.c,e=r.h,n=js(r.b),i=new xs(r.u,r.f,r.b);i.f=t,i.b=e,i.c=H(n||[]),r.o=i.toString();}r.i=new Ps(r.o),function(i){if(!i.i)throw Error("IfcHandler must be initialized!");!function(t,e){t.gb.then(function(){t.a.register("authEvent",e,mi("gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER"));});}(i.i,function(t){var e={};if(t&&t.authEvent){var n=!1;for(t=Io(t.authEvent),e=0;e<i.g.length;e++)n=i.g[e](t)||n;return (e={}).status=n?"ACK":"ERROR",Yt(e)}return e.status="ERROR",Yt(e)});}(r);})),r.l}function Ks(t){return t.m||(t.v=t.c?pi(t.c,js(t.b)):null,t.m=new Pa(t.f,Nr(t.h),t.v)),t.m}function qs(t,e,n,i,r,o,a,s,u,c,h){return (t=new Ms(t,e,n,i,r)).l=o,t.g=a,t.i=s,t.b=W(u||null),t.f=c,t.nb(h).toString()}function Hs(t){if(this.a=t||fl.INTERNAL.reactNative&&fl.INTERNAL.reactNative.AsyncStorage,!this.a)throw new Yi("internal-error","The React Native compatibility library was not found.");this.type="asyncStorage";}function Bs(t){this.b=t,this.a={},this.f=I(this.c,this);}xs.prototype.toString=function(){return this.f?yn(this.a,"v",this.f):Ln(this.a.a,"v"),this.b?yn(this.a,"eid",this.b):Ln(this.a.a,"eid"),this.c.length?yn(this.a,"fw",this.c.join(",")):Ln(this.a.a,"fw"),this.a.toString()},Ms.prototype.nb=function(t){return this.h=t,this},Ms.prototype.toString=function(){var t=Tn(this.o,"/__/auth/handler");if(yn(t,"apiKey",this.m),yn(t,"appName",this.c),yn(t,"authType",this.u),this.a.isOAuthProvider){var e=this.a;try{var n=fl.app(this.c).auth().ha();}catch(t){n=null;}for(var i in e.bb=n,yn(t,"providerId",this.a.providerId),n=Ei((e=this.a).zb))n[i]=n[i].toString();i=e.Fc,n=W(n);for(var r=0;r<i.length;r++){var o=i[r];o in n&&delete n[o];}e.eb&&e.bb&&!n[e.eb]&&(n[e.eb]=e.bb),G(n)||yn(t,"customParameters",Ti(n));}if("function"==typeof this.a.Hb&&((e=this.a.Hb()).length&&yn(t,"scopes",e.join(","))),this.l?yn(t,"redirectUrl",this.l):Ln(t.a,"redirectUrl"),this.g?yn(t,"eventId",this.g):Ln(t.a,"eventId"),this.i?yn(t,"v",this.i):Ln(t.a,"v"),this.b)for(var a in this.b)this.b.hasOwnProperty(a)&&!wn(t,a)&&yn(t,a,this.b[a]);return this.h?yn(t,"tid",this.h):Ln(t.a,"tid"),this.f?yn(t,"eid",this.f):Ln(t.a,"eid"),(a=js(this.c)).length&&yn(t,"fw",a.join(",")),t.toString()},(t=Us.prototype).Fb=function(e,n,t){var i=new Yi("popup-closed-by-user"),r=new Yi("web-storage-unsupported"),o=this,a=!1;return this.ia().then(function(){(function(t){var e={type:"webStorageSupport"};return Fs(t).then(function(){return function(e,n){return e.gb.then(function(){return new qt(function(t){e.a.send(n.type,n,t,mi("gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER"));})})}(t.i,e)}).then(function(t){if(t&&t.length&&void 0!==t[0].webStorageSupport)return t[0].webStorageSupport;throw Error()})})(o).then(function(t){t||(e&&ti(e),n(r),a=!0);});}).s(function(){}).then(function(){if(!a)return function(n){return new qt(function(e){return function t(){un(2e3).then(function(){if(n&&!n.closed)return t();e();});}()})}(e)}).then(function(){if(!a)return un(t).then(function(){n(i);})})},t.Ob=function(){var t=vi();return !Ii(t)&&!Si(t)},t.Jb=function(){return !1},t.Db=function(e,t,n,i,r,o,a,s){if(!e)return zt(new Yi("popup-blocked"));if(a&&!Ii())return this.ia().s(function(t){ti(e),r(t);}),i(),Yt();this.a||(this.a=Vs(Ks(this)));var u=this;return this.a.then(function(){var t=u.ia().s(function(t){throw ti(e),r(t),t});return i(),t}).then(function(){yo(n),a||Zn(qs(u.u,u.f,u.b,t,n,null,o,u.c,void 0,u.h,s),e);}).s(function(t){throw "auth/network-request-failed"==t.code&&(u.a=null),t})},t.Eb=function(t,e,n,i){this.a||(this.a=Vs(Ks(this)));var r=this;return this.a.then(function(){yo(e),Zn(qs(r.u,r.f,r.b,t,e,$n(),n,r.c,void 0,r.h,i));}).s(function(t){throw "auth/network-request-failed"==t.code&&(r.a=null),t})},t.ia=function(){var t=this;return Fs(this).then(function(){return t.i.gb}).s(function(){throw t.a=null,new Yi("network-request-failed")})},t.Rb=function(){return !0},t.Aa=function(t){this.g.push(t);},t.Na=function(e){K(this.g,function(t){return t==e});},(t=Hs.prototype).get=function(t){return Yt(this.a.getItem(t)).then(function(t){return t&&ki(t)})},t.set=function(t,e){return Yt(this.a.setItem(t,Ti(e)))},t.S=function(t){return Yt(this.a.removeItem(t))},t.$=function(){},t.ea=function(){};var Gs,Ws=[];function Xs(t,e,n){G(t.a)&&t.b.addEventListener("message",t.f),void 0===t.a[e]&&(t.a[e]=[]),t.a[e].push(n);}function Js(t){this.a=t;}function Ys(t){this.c=t,this.b=!1,this.a=[];}function zs(i,t,e,n){var r,o,a,s,u=e||{},c=null;if(i.b)return zt(Error("connection_unavailable"));var h=n?800:50,l="undefined"!=typeof MessageChannel?new MessageChannel:null;return new qt(function(e,n){l?(r=Math.floor(Math.random()*Math.pow(10,20)).toString(),l.port1.start(),a=setTimeout(function(){n(Error("unsupported_event"));},h),c={messageChannel:l,onMessage:o=function(t){t.data.eventId===r&&("ack"===t.data.status?(clearTimeout(a),s=setTimeout(function(){n(Error("timeout"));},3e3)):"done"===t.data.status?(clearTimeout(s),void 0!==t.data.response?e(t.data.response):n(Error("unknown_error"))):(clearTimeout(a),clearTimeout(s),n(Error("invalid_response"))));}},i.a.push(c),l.port1.addEventListener("message",o),i.c.postMessage({eventType:t,eventId:r,data:u},[l.port2])):n(Error("connection_unavailable"));}).then(function(t){return $s(i,c),t}).s(function(t){throw $s(i,c),t})}function $s(t,e){if(e){var n=e.messageChannel,i=e.onMessage;n&&(n.port1.removeEventListener("message",i),n.port1.close()),K(t.a,function(t){return t==e});}}function Zs(){if(!eu())throw new Yi("web-storage-unsupported");this.c={},this.a=[],this.b=0,this.u=l.indexedDB,this.type="indexedDB",this.g=this.l=this.f=this.i=null,this.o=!1,this.h=null;var i=this;si()&&self?(this.l=function(){var e=si()?self:null;if(M(Ws,function(t){t.b==e&&(n=t);}),!n){var n=new Bs(e);Ws.push(n);}return n}(),Xs(this.l,"keyChanged",function(t,n){return au(i).then(function(e){return 0<e.length&&M(i.a,function(t){t(e);}),{keyProcessed:V(e,n.key)}})}),Xs(this.l,"ping",function(){return Yt(["keyChanged"])})):function(){var t=l.navigator;return t&&t.serviceWorker?Yt().then(function(){return t.serviceWorker.ready}).then(function(t){return t.active||null}).s(function(){return null}):Yt(null)}().then(function(t){(i.h=t)&&(i.g=new Ys(new Js(t)),zs(i.g,"ping",null,!0).then(function(t){t[0].fulfilled&&V(t[0].value,"keyChanged")&&(i.o=!0);}).s(function(){}));});}function Qs(i){return new qt(function(e,n){var t=i.u.open("firebaseLocalStorageDb",1);t.onerror=function(t){try{t.preventDefault();}catch(t){}n(Error(t.target.error));},t.onupgradeneeded=function(t){t=t.target.result;try{t.createObjectStore("firebaseLocalStorage",{keyPath:"fbase_key"});}catch(t){n(t);}},t.onsuccess=function(t){(t=t.target.result).objectStoreNames.contains("firebaseLocalStorage")?e(t):function(i){return new qt(function(t,e){var n=i.u.deleteDatabase("firebaseLocalStorageDb");n.onsuccess=function(){t();},n.onerror=function(t){e(Error(t.target.error));};})}(i).then(function(){return Qs(i)}).then(function(t){e(t);}).s(function(t){n(t);});};})}function tu(t){return t.m||(t.m=Qs(t)),t.m}function eu(){try{return !!l.indexedDB}catch(t){return !1}}function nu(t){return t.objectStore("firebaseLocalStorage")}function iu(t,e){return t.transaction(["firebaseLocalStorage"],e?"readwrite":"readonly")}function ru(t){return new qt(function(e,n){t.onsuccess=function(t){t&&t.target?e(t.target.result):e();},t.onerror=function(t){n(t.target.error);};})}function ou(t,e){return t.g&&t.h&&function(){var t=l.navigator;return t&&t.serviceWorker&&t.serviceWorker.controller||null}()===t.h?zs(t.g,"keyChanged",{key:e},t.o).then(function(){}).s(function(){}):Yt()}function au(i){return tu(i).then(function(t){var r=nu(iu(t,!1));return r.getAll?ru(r.getAll()):new qt(function(e,n){var i=[],t=r.openCursor();t.onsuccess=function(t){(t=t.target.result)?(i.push(t.value),t.continue()):e(i);},t.onerror=function(t){n(t.target.error);};})}).then(function(t){var e={},n=[];if(0==i.b){for(n=0;n<t.length;n++)e[t[n].fbase_key]=t[n].value;n=function t(e,n){var i,r=[];for(i in e)i in n?typeof e[i]!=typeof n[i]?r.push(i):"object"==typeof e[i]&&null!=e[i]&&null!=n[i]?0<t(e[i],n[i]).length&&r.push(i):e[i]!==n[i]&&r.push(i):r.push(i);for(i in n)i in e||r.push(i);return r}(i.c,e),i.c=e;}return n})}function su(t){t.i&&t.i.cancel("STOP_EVENT"),t.f&&(clearTimeout(t.f),t.f=null);}function uu(t){var i=this,r=null;this.a=[],this.type="indexedDB",this.c=t,this.b=Yt().then(function(){if(eu()){var e=Ai(),n="__sak"+e;return Gs=Gs||new Zs,(r=Gs).set(n,e).then(function(){return r.get(n)}).then(function(t){if(t!==e)throw Error("indexedDB not supported!");return r.S(n)}).then(function(){return r}).s(function(){return i.c})}return i.c}).then(function(t){return i.type=t.type,t.$(function(e){M(i.a,function(t){t(e);});}),t});}function cu(){this.a={},this.type="inMemory";}function hu(){if(!function(){var t="Node"==ui();if(!(t=lu()||t&&fl.INTERNAL.node&&fl.INTERNAL.node.localStorage))return !1;try{return t.setItem("__sak","1"),t.removeItem("__sak"),!0}catch(t){return !1}}()){if("Node"==ui())throw new Yi("internal-error","The LocalStorage compatibility library was not found.");throw new Yi("web-storage-unsupported")}this.a=lu()||fl.INTERNAL.node.localStorage,this.type="localStorage";}function lu(){try{var t=l.localStorage,e=Ai();return t&&(t.setItem(e,"1"),t.removeItem(e)),t}catch(t){return null}}function fu(){this.type="nullStorage";}function du(){if(!function(){var t="Node"==ui();if(!(t=pu()||t&&fl.INTERNAL.node&&fl.INTERNAL.node.sessionStorage))return !1;try{return t.setItem("__sak","1"),t.removeItem("__sak"),!0}catch(t){return !1}}()){if("Node"==ui())throw new Yi("internal-error","The SessionStorage compatibility library was not found.");throw new Yi("web-storage-unsupported")}this.a=pu()||fl.INTERNAL.node.sessionStorage,this.type="sessionStorage";}function pu(){try{var t=l.sessionStorage,e=Ai();return t&&(t.setItem(e,"1"),t.removeItem(e)),t}catch(t){return null}}function vu(){var t={};t.Browser=bu,t.Node=yu,t.ReactNative=wu,t.Worker=Iu,this.a=t[ui()];}Bs.prototype.c=function(n){var i=n.data.eventType,r=n.data.eventId,t=this.a[i];if(t&&0<t.length){n.ports[0].postMessage({status:"ack",eventId:r,eventType:i,response:null});var e=[];M(t,function(t){e.push(Yt().then(function(){return t(n.origin,n.data.data)}));}),Zt(e).then(function(t){var e=[];M(t,function(t){e.push({fulfilled:t.Gb,value:t.value,reason:t.reason?t.reason.message:void 0});}),M(e,function(t){for(var e in t)void 0===t[e]&&delete t[e];}),n.ports[0].postMessage({status:"done",eventId:r,eventType:i,response:e});});}},Js.prototype.postMessage=function(t,e){this.a.postMessage(t,e);},Ys.prototype.close=function(){for(;0<this.a.length;)$s(this,this.a[0]);this.b=!0;},(t=Zs.prototype).set=function(n,i){var r,o=!1,a=this;return tu(this).then(function(t){return ru((t=nu(iu(r=t,!0))).get(n))}).then(function(t){var e=nu(iu(r,!0));return t?(t.value=i,ru(e.put(t))):(a.b++,o=!0,(t={}).fbase_key=n,t.value=i,ru(e.add(t)))}).then(function(){return a.c[n]=i,ou(a,n)}).ka(function(){o&&a.b--;})},t.get=function(e){return tu(this).then(function(t){return ru(nu(iu(t,!1)).get(e))}).then(function(t){return t&&t.value})},t.S=function(e){var n=!1,i=this;return tu(this).then(function(t){return n=!0,i.b++,ru(nu(iu(t,!0)).delete(e))}).then(function(){return delete i.c[e],ou(i,e)}).ka(function(){n&&i.b--;})},t.$=function(t){0==this.a.length&&function(t){su(t),function e(){t.f=setTimeout(function(){t.i=au(t).then(function(e){0<e.length&&M(t.a,function(t){t(e);});}).then(function(){e();}).s(function(t){"STOP_EVENT"!=t.message&&e();});},800);}();}(this),this.a.push(t);},t.ea=function(e){K(this.a,function(t){return t==e}),0==this.a.length&&su(this);},(t=uu.prototype).get=function(e){return this.b.then(function(t){return t.get(e)})},t.set=function(e,n){return this.b.then(function(t){return t.set(e,n)})},t.S=function(e){return this.b.then(function(t){return t.S(e)})},t.$=function(t){this.a.push(t);},t.ea=function(e){K(this.a,function(t){return t==e});},(t=cu.prototype).get=function(t){return Yt(this.a[t])},t.set=function(t,e){return this.a[t]=e,Yt()},t.S=function(t){return delete this.a[t],Yt()},t.$=function(){},t.ea=function(){},(t=hu.prototype).get=function(t){var e=this;return Yt().then(function(){return ki(e.a.getItem(t))})},t.set=function(e,n){var i=this;return Yt().then(function(){var t=Ti(n);null===t?i.S(e):i.a.setItem(e,t);})},t.S=function(t){var e=this;return Yt().then(function(){e.a.removeItem(t);})},t.$=function(t){l.window&&Be(l.window,"storage",t);},t.ea=function(t){l.window&&Xe(l.window,"storage",t);},(t=fu.prototype).get=function(){return Yt(null)},t.set=function(){return Yt()},t.S=function(){return Yt()},t.$=function(){},t.ea=function(){},(t=du.prototype).get=function(t){var e=this;return Yt().then(function(){return ki(e.a.getItem(t))})},t.set=function(e,n){var i=this;return Yt().then(function(){var t=Ti(n);null===t?i.S(e):i.a.setItem(e,t);})},t.S=function(t){var e=this;return Yt().then(function(){e.a.removeItem(t);})},t.$=function(){},t.ea=function(){};var mu,gu,bu={C:hu,Ta:du},yu={C:hu,Ta:du},wu={C:Hs,Ta:fu},Iu={C:hu,Ta:fu},Tu={ad:"local",NONE:"none",cd:"session"};function Eu(){var t=!(Si(vi())||!ai()),e=Ii(),n=gi();this.m=t,this.h=e,this.l=n,this.a={},t=mu=mu||new vu;try{this.g=!zn()&&Ri()||!l.indexedDB?new t.a.C:new uu(si()?new cu:new t.a.C);}catch(t){this.g=new cu,this.h=!0;}try{this.i=new t.a.Ta;}catch(t){this.i=new cu;}this.u=new cu,this.f=I(this.Pb,this),this.b={};}function ku(){return gu=gu||new Eu}function Au(t,e){switch(e){case"session":return t.i;case"none":return t.u;default:return t.g}}function Su(t,e){return "firebase:"+t.name+(e?":"+e:"")}function Nu(t,e,n){return n=Su(e,n),"local"==e.C&&(t.b[n]=null),Au(t,e.C).S(n)}function Ou(t){t.c&&(clearInterval(t.c),t.c=null);}function _u(t){this.a=t,this.b=ku();}(t=Eu.prototype).get=function(t,e){return Au(this,t.C).get(Su(t,e))},t.set=function(e,t,n){var i=Su(e,n),r=this,o=Au(this,e.C);return o.set(i,t).then(function(){return o.get(i)}).then(function(t){"local"==e.C&&(r.b[i]=t);})},t.addListener=function(t,e,n){t=Su(t,e),this.l&&(this.b[t]=l.localStorage.getItem(t)),G(this.a)&&(Au(this,"local").$(this.f),this.h||(zn()||!Ri())&&l.indexedDB||!this.l||function(i){Ou(i),i.c=setInterval(function(){for(var t in i.a){var e=l.localStorage.getItem(t),n=i.b[t];e!=n&&(i.b[t]=e,e=new De({type:"storage",key:t,target:window,oldValue:n,newValue:e,a:!0}),i.Pb(e));}},1e3);}(this)),this.a[t]||(this.a[t]=[]),this.a[t].push(n);},t.removeListener=function(t,e,n){t=Su(t,e),this.a[t]&&(K(this.a[t],function(t){return t==n}),0==this.a[t].length&&delete this.a[t]),G(this.a)&&(Au(this,"local").ea(this.f),Ou(this));},t.Pb=function(t){if(t&&t.f){var e=t.a.key;if(null==e)for(var n in this.a){var i=this.b[n];void 0===i&&(i=null);var r=l.localStorage.getItem(n);r!==i&&(this.b[n]=r,this.$a(n));}else if(0==e.indexOf("firebase:")&&this.a[e]){if(void 0!==t.a.a?Au(this,"local").ea(this.f):Ou(this),this.m)if(n=l.localStorage.getItem(e),(i=t.a.newValue)!==n)null!==i?l.localStorage.setItem(e,i):l.localStorage.removeItem(e);else if(this.b[e]===i&&void 0===t.a.a)return;var o=this;n=function(){void 0===t.a.a&&o.b[e]===l.localStorage.getItem(e)||(o.b[e]=l.localStorage.getItem(e),o.$a(e));},me&&Ae&&10==Ae&&l.localStorage.getItem(e)!==t.a.newValue&&t.a.newValue!==t.a.oldValue?setTimeout(n,10):n();}}else M(t,I(this.$a,this));},t.$a=function(t){this.a[t]&&M(this.a[t],function(t){t();});};var Pu,Ru={name:"authEvent",C:"local"};function Cu(){this.a=ku();}function Du(t,e){this.b=Lu,this.f=l.Uint8Array?new Uint8Array(this.b):Array(this.b),this.g=this.c=0,this.a=[],this.i=t,this.h=e,this.l=l.Int32Array?new Int32Array(64):Array(64),void 0!==Pu||(Pu=l.Int32Array?new Int32Array(Ku):Ku),this.reset();}k(Du,function(){this.b=-1;});for(var Lu=64,xu=Lu-1,Mu=[],ju=0;ju<xu;ju++)Mu[ju]=0;var Uu=q(128,Mu);function Vu(t){for(var e=t.f,n=t.l,i=0,r=0;r<e.length;)n[i++]=e[r]<<24|e[r+1]<<16|e[r+2]<<8|e[r+3],r=4*i;for(e=16;e<64;e++){r=0|n[e-15],i=0|n[e-2];var o=(0|n[e-16])+((r>>>7|r<<25)^(r>>>18|r<<14)^r>>>3)|0,a=(0|n[e-7])+((i>>>17|i<<15)^(i>>>19|i<<13)^i>>>10)|0;n[e]=o+a|0;}i=0|t.a[0],r=0|t.a[1];var s=0|t.a[2],u=0|t.a[3],c=0|t.a[4],h=0|t.a[5],l=0|t.a[6];for(o=0|t.a[7],e=0;e<64;e++){var f=((i>>>2|i<<30)^(i>>>13|i<<19)^(i>>>22|i<<10))+(i&r^i&s^r&s)|0;a=(o=o+((c>>>6|c<<26)^(c>>>11|c<<21)^(c>>>25|c<<7))|0)+((a=(a=c&h^~c&l)+(0|Pu[e])|0)+(0|n[e])|0)|0,o=l,l=h,h=c,c=u+a|0,u=s,s=r,r=i,i=a+f|0;}t.a[0]=t.a[0]+i|0,t.a[1]=t.a[1]+r|0,t.a[2]=t.a[2]+s|0,t.a[3]=t.a[3]+u|0,t.a[4]=t.a[4]+c|0,t.a[5]=t.a[5]+h|0,t.a[6]=t.a[6]+l|0,t.a[7]=t.a[7]+o|0;}function Fu(t,e,n){void 0===n&&(n=e.length);var i=0,r=t.c;if(h(e))for(;i<n;)t.f[r++]=e.charCodeAt(i++),r==t.b&&(Vu(t),r=0);else{if(!v(e))throw Error("message must be string or array");for(;i<n;){var o=e[i++];if(!("number"==typeof o&&0<=o&&o<=255&&o==(0|o)))throw Error("message must be a byte array");t.f[r++]=o,r==t.b&&(Vu(t),r=0);}}t.c=r,t.g+=n;}Du.prototype.reset=function(){this.g=this.c=0,this.a=l.Int32Array?new Int32Array(this.h):H(this.h);};var Ku=[1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298];function qu(){Du.call(this,8,Hu);}k(qu,Du);var Hu=[1779033703,3144134277,1013904242,2773480762,1359893119,2600822924,528734635,1541459225];function Bu(t,e,n,i,r){this.u=t,this.i=e,this.l=n,this.m=i||null,this.o=r||null,this.h=e+":"+n,this.v=new Cu,this.g=new _u(this.h),this.f=null,this.b=[],this.a=this.c=null;}function Gu(t){return new Yi("invalid-cordova-configuration",t)}function Wu(t){var e=new qu;Fu(e,t),t=[];var n=8*e.g;e.c<56?Fu(e,Uu,56-e.c):Fu(e,Uu,e.b-(e.c-56));for(var i=63;56<=i;i--)e.f[i]=255&n,n/=256;for(Vu(e),i=n=0;i<e.i;i++)for(var r=24;0<=r;r-=8)t[n++]=e.a[i]>>r&255;return function(t){return j(t,function(t){return 1<(t=t.toString(16)).length?t:"0"+t}).join("")}(t)}function Xu(t,e){for(var n=0;n<t.b.length;n++)try{t.b[n](e);}catch(t){}}function Ju(i){return i.f||(i.f=i.ia().then(function(){return new qt(function(n){i.Aa(function t(e){return n(e),i.Na(t),!1}),function(r){function e(i){t=!0,n&&n.cancel(),Yu(r).then(function(t){var e=o;if(t&&i&&i.url){var n=null;-1!=(e=Kr(i.url)).indexOf("/__/auth/callback")&&(n=(n="object"==typeof(n=ki(wn(n=In(e),"firebaseError")||null))?zi(n):null)?new wo(t.c,t.b,null,null,n,null,t.R()):new wo(t.c,t.b,e,t.f,null,null,t.R())),e=n||o;}Xu(r,e);});}var o=new wo("unknown",null,null,null,new Yi("no-auth-event")),t=!1,n=un(500).then(function(){return Yu(r).then(function(){t||Xu(r,o);})}),i=l.handleOpenURL;l.handleOpenURL=function(t){if(0==t.toLowerCase().indexOf(mi("BuildInfo.packageName",l).toLowerCase()+"://")&&e({url:t}),"function"==typeof i)try{i(t);}catch(t){console.error(t);}},ko=ko||new To,function(t){var n=ko;n.a.push(t),n.b||(n.b=function(t){for(var e=0;e<n.a.length;e++)n.a[e](t);},"function"==typeof(t=mi("universalLinks.subscribe",l))&&t(null,n.b));}(e);}(i);})})),i.f}function Yu(e){var n=null;return function(t){return t.b.get(Ru,t.a).then(function(t){return Io(t)})}(e.g).then(function(t){return n=t,Nu((t=e.g).b,Ru,t.a)}).then(function(){return n})}function zu(t){this.a=t,this.b=ku();}(t=Bu.prototype).ia=function(){return this.Da?this.Da:this.Da=(oi(void 0)?ri().then(function(){return new qt(function(t,e){var n=l.document,i=setTimeout(function(){e(Error("Cordova framework is not ready."));},1e3);n.addEventListener("deviceready",function(){clearTimeout(i),t();},!1);})}):zt(Error("Cordova must run in an Android or iOS file scheme."))).then(function(){if("function"!=typeof mi("universalLinks.subscribe",l))throw Gu("cordova-universal-links-plugin-fix is not installed");if(void 0===mi("BuildInfo.packageName",l))throw Gu("cordova-plugin-buildinfo is not installed");if("function"!=typeof mi("cordova.plugins.browsertab.openUrl",l))throw Gu("cordova-plugin-browsertab is not installed");if("function"!=typeof mi("cordova.InAppBrowser.open",l))throw Gu("cordova-plugin-inappbrowser is not installed")},function(){throw new Yi("cordova-not-ready")})},t.Fb=function(t,e){return e(new Yi("operation-not-supported-in-this-environment")),Yt()},t.Db=function(){return zt(new Yi("operation-not-supported-in-this-environment"))},t.Rb=function(){return !1},t.Ob=function(){return !0},t.Jb=function(){return !0},t.Eb=function(t,e,n,i){if(this.c)return zt(new Yi("redirect-operation-pending"));var r=this,o=l.document,a=null,s=null,u=null,c=null;return this.c=Yt().then(function(){return yo(e),Ju(r)}).then(function(){return function(n,t,e,i,r){var o=function(){for(var t=20,e=[];0<t;)e.push("1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".charAt(Math.floor(62*Math.random()))),t--;return e.join("")}(),a=new wo(t,i,null,o,new Yi("no-auth-event"),null,r),s=mi("BuildInfo.packageName",l);if("string"!=typeof s)throw new Yi("invalid-cordova-configuration");var u=mi("BuildInfo.displayName",l),c={};if(vi().toLowerCase().match(/iphone|ipad|ipod/))c.ibi=s;else{if(!vi().toLowerCase().match(/android/))return zt(new Yi("operation-not-supported-in-this-environment"));c.apn=s;}u&&(c.appDisplayName=u),o=Wu(o),c.sessionId=o;var h=qs(n.u,n.i,n.l,t,e,null,i,n.m,c,n.o,r);return n.ia().then(function(){var t=n.h;return n.v.a.set(Ru,a.A(),t)}).then(function(){var t=mi("cordova.plugins.browsertab.isAvailable",l);if("function"!=typeof t)throw new Yi("invalid-cordova-configuration");var e=null;t(function(t){if(t){if("function"!=typeof(e=mi("cordova.plugins.browsertab.openUrl",l)))throw new Yi("invalid-cordova-configuration");e(h);}else{if("function"!=typeof(e=mi("cordova.InAppBrowser.open",l)))throw new Yi("invalid-cordova-configuration");t=vi(),n.a=e(h,t.match(/(iPad|iPhone|iPod).*OS 7_\d/i)||t.match(/(iPad|iPhone|iPod).*OS 8_\d/i)?"_blank":"_system","location=yes");}});})}(r,t,e,n,i)}).then(function(){return new qt(function(e,t){s=function(){var t=mi("cordova.plugins.browsertab.close",l);return e(),"function"==typeof t&&t(),r.a&&"function"==typeof r.a.close&&(r.a.close(),r.a=null),!1},r.Aa(s),u=function(){a=a||un(2e3).then(function(){t(new Yi("redirect-cancelled-by-user"));});},c=function(){_i()&&u();},o.addEventListener("resume",u,!1),vi().toLowerCase().match(/android/)||o.addEventListener("visibilitychange",c,!1);}).s(function(t){return Yu(r).then(function(){throw t})})}).ka(function(){u&&o.removeEventListener("resume",u,!1),c&&o.removeEventListener("visibilitychange",c,!1),a&&a.cancel(),s&&r.Na(s),r.c=null;})},t.Aa=function(e){this.b.push(e),Ju(this).s(function(t){"auth/invalid-cordova-configuration"===t.code&&(t=new wo("unknown",null,null,null,new Yi("no-auth-event")),e(t));});},t.Na=function(e){K(this.b,function(t){return t==e});};var $u={name:"pendingRedirect",C:"session"};function Zu(t){return Nu(t.b,$u,t.a)}function Qu(t,e,n){this.i={},this.v=0,this.B=t,this.u=e,this.m=n,this.h=[],this.f=!1,this.l=I(this.o,this),this.b=new dc,this.w=new bc,this.g=new zu(this.u+":"+this.m),this.c={},this.c.unknown=this.b,this.c.signInViaRedirect=this.b,this.c.linkViaRedirect=this.b,this.c.reauthViaRedirect=this.b,this.c.signInViaPopup=this.w,this.c.linkViaPopup=this.w,this.c.reauthViaPopup=this.w,this.a=tc(this.B,this.u,this.m,Ar);}function tc(t,e,n,i){var r=fl.SDK_VERSION||null;return oi()?new Bu(t,e,n,r,i):new Us(t,e,n,r,i)}function ec(e){e.f||(e.f=!0,e.a.Aa(e.l));var n=e.a;return e.a.ia().s(function(t){throw e.a==n&&e.reset(),t})}function nc(n){n.a.Ob()&&ec(n).s(function(t){var e=new wo("unknown",null,null,null,new Yi("operation-not-supported-in-this-environment"));uc(t)&&n.o(e);}),n.a.Jb()||pc(n.b);}function ic(n,t){V(n.h,t)||n.h.push(t),n.f||function(t){return t.b.get($u,t.a).then(function(t){return "pending"==t})}(n.g).then(function(t){t?Zu(n.g).then(function(){ec(n).s(function(t){var e=new wo("unknown",null,null,null,new Yi("operation-not-supported-in-this-environment"));uc(t)&&n.o(e);});}):nc(n);}).s(function(){nc(n);});}function rc(t,e){K(t.h,function(t){return t==e});}Qu.prototype.reset=function(){this.f=!1,this.a.Na(this.l),this.a=tc(this.B,this.u,this.m),this.i={};},Qu.prototype.o=function(t){if(!t)throw new Yi("invalid-auth-event");if(6e5<=E()-this.v&&(this.i={},this.v=0),t&&t.getUid()&&this.i.hasOwnProperty(t.getUid()))return !1;for(var e=!1,n=0;n<this.h.length;n++){var i=this.h[n];if(i.xb(t.c,t.b)){(e=this.c[t.c])&&(e.h(t,i),t&&(t.f||t.b)&&(this.i[t.getUid()]=!0,this.v=E())),e=!0;break}}return pc(this.b),e};var oc=new Oi(2e3,1e4),ac=new Oi(3e4,6e4);function sc(t,e,n,i,r,o,a){return t.a.Db(e,n,i,function(){t.f||(t.f=!0,t.a.Aa(t.l));},function(){t.reset();},r,o,a)}function uc(t){return !(!t||"auth/cordova-not-ready"!=t.code)}function cc(e,t,n,i,r){var o;return function(t){return t.b.set($u,"pending",t.a)}(e.g).then(function(){return e.a.Eb(t,n,i,r).s(function(t){if(uc(t))throw new Yi("operation-not-supported-in-this-environment");return o=t,Zu(e.g).then(function(){throw o})}).then(function(){return e.a.Rb()?new qt(function(){}):Zu(e.g).then(function(){return e.oa()}).then(function(){}).s(function(){})})})}function hc(t,e,n,i,r){return t.a.Fb(i,function(t){e.ja(n,null,t,r);},oc.get())}Qu.prototype.oa=function(){return this.b.oa()};var lc={};function fc(t,e,n){var i=e+":"+n;return lc[i]||(lc[i]=new Qu(t,e,n)),lc[i]}function dc(){this.b=null,this.f=[],this.c=[],this.a=null,this.i=this.g=!1;}function pc(t){t.g||(t.g=!0,gc(t,!1,null,null));}function vc(t){t.g&&!t.i&&gc(t,!1,null,null);}function mc(t,e){if(t.b=function(){return Yt(e)},t.f.length)for(var n=0;n<t.f.length;n++)t.f[n](e);}function gc(t,e,n,i){e?i?function(t,e){if(t.b=function(){return zt(e)},t.c.length)for(var n=0;n<t.c.length;n++)t.c[n](e);}(t,i):mc(t,n):mc(t,{user:null}),t.f=[],t.c=[];}function bc(){}function yc(){this.vb=!1,Object.defineProperty(this,"appVerificationDisabled",{get:function(){return this.vb},set:function(t){this.vb=t;},enumerable:!1});}function wc(t,e){this.a=e,Mi(this,"verificationId",t);}function Ic(t,e,n,i){return new mo(t).Wa(e,n).then(function(t){return new wc(t,i)})}function Tc(t){var e=kr(t);if(!(e&&e.exp&&e.auth_time&&e.iat))throw new Yi("internal-error","An internal error occurred. The token obtained by Firebase appears to be malformed. Please retry the operation.");ji(this,{token:t,expirationTime:Pi(1e3*e.exp),authTime:Pi(1e3*e.auth_time),issuedAtTime:Pi(1e3*e.iat),signInProvider:e.firebase&&e.firebase.sign_in_provider?e.firebase.sign_in_provider:null,claims:e});}function Ec(t,e,n){if(this.h=t,this.i=e,this.g=n,this.c=3e4,this.f=96e4,this.b=null,this.a=this.c,this.f<this.c)throw Error("Proactive refresh lower bound greater than upper bound!")}function kc(t,e){return e?(t.a=t.c,t.g()):(e=t.a,t.a*=2,t.a>t.f&&(t.a=t.f),e)}function Ac(t){this.f=t,this.b=this.a=null,this.c=0;}function Sc(t,e){var n=e[Ca],i=e.refreshToken;e=Nc(e.expiresIn),t.b=n,t.c=e,t.a=i;}function Nc(t){return E()+1e3*parseInt(t,10)}function Oc(e,t){return function(t,i){return new qt(function(e,n){"refresh_token"==i.grant_type&&i.refresh_token||"authorization_code"==i.grant_type&&i.code?Va(t,t.l+"?key="+encodeURIComponent(t.c),function(t){t?t.error?n(_s(t)):t.access_token&&t.refresh_token?e(t):n(new Yi("internal-error")):n(new Yi("network-request-failed"));},"POST",Dn(i).toString(),t.g,t.u.get()):n(new Yi("internal-error"));})}(e.f,t).then(function(t){return e.b=t.access_token,e.c=Nc(t.expires_in),e.a=t.refresh_token,{accessToken:e.b,expirationTime:e.c,refreshToken:e.a}}).s(function(t){throw "auth/user-token-expired"==t.code&&(e.a=null),t})}function _c(t,e){this.a=t||null,this.b=e||null,ji(this,{lastSignInTime:Pi(e||null),creationTime:Pi(t||null)});}function Pc(t,e,n,i,r,o){ji(this,{uid:t,displayName:i||null,photoURL:r||null,email:n||null,phoneNumber:o||null,providerId:e});}function Rc(t,e){for(var n in Ce.call(this,t),e)this[n]=e[n];}function Cc(t,e,n){this.I=[],this.l=t.apiKey,this.m=t.appName,this.o=t.authDomain||null,t=fl.SDK_VERSION?pi(fl.SDK_VERSION):null,this.a=new Pa(this.l,Nr(Ar),t),this.b=new Ac(this.a),Vc(this,e[Ca]),Sc(this.b,e),Mi(this,"refreshToken",this.b.a),qc(this,n||{}),nn.call(this),this.J=!1,this.o&&bi()&&(this.i=fc(this.o,this.l,this.m)),this.O=[],this.h=null,this.w=function(e){return new Ec(function(){return e.G(!0)},function(t){return !(!t||"auth/network-request-failed"!=t.code)},function(){var t=e.b.c-E()-3e5;return 0<t?t:0})}(this),this.W=I(this.Ja,this);var i=this;this.ga=null,this.xa=function(t){i.ua(t.g);},this.Z=null,this.P=[],this.wa=function(t){Lc(i,t.c);},this.Y=null;}function Dc(t,e){t.Z&&Xe(t.Z,"languageCodeChanged",t.xa),(t.Z=e)&&Be(e,"languageCodeChanged",t.xa);}function Lc(t,e){t.P=e,Ua(t.a,fl.SDK_VERSION?pi(fl.SDK_VERSION,t.P):null);}function xc(t,e){t.Y&&Xe(t.Y,"frameworkChanged",t.wa),(t.Y=e)&&Be(e,"frameworkChanged",t.wa);}function Mc(e){try{return fl.app(e.m).auth()}catch(t){throw new Yi("internal-error","No firebase.auth.Auth instance is available for the Firebase App '"+e.m+"'!")}}function jc(t){t.B||t.w.b||(t.w.start(),Xe(t,"tokenChanged",t.W),Be(t,"tokenChanged",t.W));}function Uc(t){Xe(t,"tokenChanged",t.W),t.w.stop();}function Vc(t,e){t.ma=e,Mi(t,"_lat",e);}function Fc(t){for(var e=[],n=0;n<t.O.length;n++)e.push(t.O[n](t));return Zt(e).then(function(){return t})}function Kc(t){t.i&&!t.J&&(t.J=!0,ic(t.i,t));}function qc(t,e){ji(t,{uid:e.uid,displayName:e.displayName||null,photoURL:e.photoURL||null,email:e.email||null,emailVerified:e.emailVerified||!1,phoneNumber:e.phoneNumber||null,isAnonymous:e.isAnonymous||!1,tenantId:e.tenantId||null,metadata:new _c(e.createdAt,e.lastLoginAt),providerData:[]}),t.a.b=t.tenantId;}function Hc(){}function Bc(t){return Yt().then(function(){if(t.B)throw new Yi("app-deleted")})}function Gc(t){return j(t.providerData,function(t){return t.providerId})}function Wc(t,e){e&&(Xc(t,e.providerId),t.providerData.push(e));}function Xc(t,e){K(t.providerData,function(t){return t.providerId==e});}function Jc(t,e,n){("uid"!=e||n)&&t.hasOwnProperty(e)&&Mi(t,e,n);}function Yc(e,t){e!=t&&(ji(e,{uid:t.uid,displayName:t.displayName,photoURL:t.photoURL,email:t.email,emailVerified:t.emailVerified,phoneNumber:t.phoneNumber,isAnonymous:t.isAnonymous,tenantId:t.tenantId,providerData:[]}),t.metadata?Mi(e,"metadata",function(t){return new _c(t.a,t.b)}(t.metadata)):Mi(e,"metadata",new _c),M(t.providerData,function(t){Wc(e,t);}),function(t,e){t.b=e.b,t.a=e.a,t.c=e.c;}(e.b,t.b),Mi(e,"refreshToken",e.b.a));}function zc(n){return n.G().then(function(t){var e=n.isAnonymous;return function(t,e){return Ns(t.a,us,{idToken:e}).then(I(t.zc,t))}(n,t).then(function(){return e||Jc(n,"isAnonymous",!1),t})})}function $c(t,e){e[Ca]&&t.ma!=e[Ca]&&(Sc(t.b,e),t.dispatchEvent(new Rc("tokenChanged")),Vc(t,e[Ca]),Jc(t,"refreshToken",t.b.a));}function Zc(t,e){return zc(t).then(function(){if(V(Gc(t),e))return Fc(t).then(function(){throw new Yi("provider-already-linked")})})}function Qc(t,e,n){return Ui({user:t,credential:bo(e),additionalUserInfo:e=Cr(e),operationType:n})}function th(t,e){return $c(t,e),t.reload().then(function(){return t})}function eh(n,i,t,e,r){if(!bi())return zt(new Yi("operation-not-supported-in-this-environment"));if(n.h&&!r)return zt(n.h);var o=Rr(t.providerId),a=Ai(n.uid+":::"),s=null;(!Ii()||ai())&&n.o&&t.isOAuthProvider&&(s=qs(n.o,n.l,n.m,i,t,null,a,fl.SDK_VERSION||null,null,null,n.tenantId));var u=ei(s,o&&o.sa,o&&o.ra);return e=e().then(function(){if(ih(n),!r)return n.G().then(function(){})}).then(function(){return sc(n.i,u,i,t,a,!!s,n.tenantId)}).then(function(){return new qt(function(t,e){n.ja(i,null,new Yi("cancelled-popup-request"),n.g||null),n.f=t,n.v=e,n.g=a,n.c=hc(n.i,n,i,u,a);})}).then(function(t){return u&&ti(u),t?Ui(t):null}).s(function(t){throw u&&ti(u),t}),rh(n,e,r)}function nh(e,t,n,i,r){if(!bi())return zt(new Yi("operation-not-supported-in-this-environment"));if(e.h&&!r)return zt(e.h);var o=null,a=Ai(e.uid+":::");return i=i().then(function(){if(ih(e),!r)return e.G().then(function(){})}).then(function(){return e.ca=a,Fc(e)}).then(function(t){return e.da&&(t=(t=e.da).b.set(sh,e.A(),t.a)),t}).then(function(){return cc(e.i,t,n,a,e.tenantId)}).s(function(t){if(o=t,e.da)return uh(e.da);throw o}).then(function(){if(o)throw o}),rh(e,i,r)}function ih(t){if(!t.i||!t.J){if(t.i&&!t.J)throw new Yi("internal-error");throw new Yi("auth-domain-config-required")}}function rh(t,e,n){var i=function(e,t,n){return e.h&&!n?(t.cancel(),zt(e.h)):t.s(function(t){throw !t||"auth/user-disabled"!=t.code&&"auth/user-token-expired"!=t.code||(e.h||e.dispatchEvent(new Rc("userInvalidated")),e.h=t),t})}(t,e,n);return t.I.push(i),i.ka(function(){F(t.I,i);}),i}function oh(t){if(!t.apiKey)return null;var e={apiKey:t.apiKey,authDomain:t.authDomain,appName:t.appName},n={};if(!(t.stsTokenManager&&t.stsTokenManager.accessToken&&t.stsTokenManager.expirationTime))return null;n[Ca]=t.stsTokenManager.accessToken,n.refreshToken=t.stsTokenManager.refreshToken||null,n.expiresIn=(t.stsTokenManager.expirationTime-E())/1e3;var i=new Cc(e,n,t);return t.providerData&&M(t.providerData,function(t){t&&Wc(i,Ui(t));}),t.redirectEventId&&(i.ca=t.redirectEventId),i}function ah(t){this.a=t,this.b=ku();}dc.prototype.reset=function(){this.b=null,this.a&&(this.a.cancel(),this.a=null);},dc.prototype.h=function(t,e){if(t){this.reset(),this.g=!0;var n=t.c,i=t.b,r=t.a&&"auth/web-storage-unsupported"==t.a.code,o=t.a&&"auth/operation-not-supported-in-this-environment"==t.a.code;this.i=!(!r&&!o),"unknown"!=n||r||o?t.a?(gc(this,!0,null,t.a),Yt()):e.Ba(n,i)?function(e,t,n){n=n.Ba(t.c,t.b);var i=t.g,r=t.f,o=t.i,a=t.R(),s=!!t.c.match(/Redirect$/);n(i,r,a,o).then(function(t){gc(e,s,t,null);}).s(function(t){gc(e,s,null,t);});}(this,t,e):zt(new Yi("invalid-auth-event")):(gc(this,!1,null,null),Yt());}else zt(new Yi("invalid-auth-event"));},dc.prototype.oa=function(){var n=this;return new qt(function(t,e){n.b?n.b().then(t,e):(n.f.push(t),n.c.push(e),function(t){var e=new Yi("timeout");t.a&&t.a.cancel(),t.a=un(ac.get()).then(function(){t.b||(t.g=!0,gc(t,!0,null,e));});}(n));})},bc.prototype.h=function(t,e){if(t){var n=t.c,i=t.b;t.a?(e.ja(t.c,null,t.a,t.b),Yt()):e.Ba(n,i)?function(t,e){var n=t.b,i=t.c;e.Ba(i,n)(t.g,t.f,t.R(),t.i).then(function(t){e.ja(i,t,null,n);}).s(function(t){e.ja(i,null,t,n);});}(t,e):zt(new Yi("invalid-auth-event"));}else zt(new Yi("invalid-auth-event"));},wc.prototype.confirm=function(t){return t=go(this.verificationId,t),this.a(t)},Ec.prototype.start=function(){this.a=this.c,function e(n,t){n.stop();n.b=un(kc(n,t)).then(function(){return e=l.document,n=null,_i()||!e?Yt():new qt(function(t){n=function(){_i()&&(e.removeEventListener("visibilitychange",n,!1),t());},e.addEventListener("visibilitychange",n,!1);}).s(function(t){throw e.removeEventListener("visibilitychange",n,!1),t});var e,n;}).then(function(){return n.h()}).then(function(){e(n,!0);}).s(function(t){n.i(t)&&e(n,!1);});}(this,!0);},Ec.prototype.stop=function(){this.b&&(this.b.cancel(),this.b=null);},Ac.prototype.A=function(){return {apiKey:this.f.c,refreshToken:this.a,accessToken:this.b,expirationTime:this.c}},Ac.prototype.getToken=function(t){return t=!!t,this.b&&!this.a?zt(new Yi("user-token-expired")):t||!this.b||E()>this.c-3e4?this.a?Oc(this,{grant_type:"refresh_token",refresh_token:this.a}):Yt(null):Yt({accessToken:this.b,expirationTime:this.c,refreshToken:this.a})},_c.prototype.A=function(){return {lastLoginAt:this.b,createdAt:this.a}},k(Rc,Ce),k(Cc,nn),Cc.prototype.ua=function(t){this.ga=t,ja(this.a,t);},Cc.prototype.ha=function(){return this.ga},Cc.prototype.Ca=function(){return H(this.P)},Cc.prototype.Ja=function(){this.w.b&&(this.w.stop(),this.w.start());},Mi(Cc.prototype,"providerId","firebase"),(t=Cc.prototype).reload=function(){var t=this;return rh(this,Bc(this).then(function(){return zc(t).then(function(){return Fc(t)}).then(Hc)}))},t.dc=function(t){return this.G(t).then(function(t){return new Tc(t)})},t.G=function(t){var e=this;return rh(this,Bc(this).then(function(){return e.b.getToken(t)}).then(function(t){if(!t)throw new Yi("internal-error");return t.accessToken!=e.ma&&(Vc(e,t.accessToken),e.dispatchEvent(new Rc("tokenChanged"))),Jc(e,"refreshToken",t.refreshToken),t.accessToken}))},t.zc=function(t){if(!(t=t.users)||!t.length)throw new Yi("internal-error");qc(this,{uid:(t=t[0]).localId,displayName:t.displayName,photoURL:t.photoUrl,email:t.email,emailVerified:!!t.emailVerified,phoneNumber:t.phoneNumber,lastLoginAt:t.lastLoginAt,createdAt:t.createdAt,tenantId:t.tenantId});for(var e=function(t){return (t=t.providerUserInfo)&&t.length?j(t,function(t){return new Pc(t.rawId,t.providerId,t.email,t.displayName,t.photoUrl,t.phoneNumber)}):[]}(t),n=0;n<e.length;n++)Wc(this,e[n]);Jc(this,"isAnonymous",!(this.email&&t.passwordHash||this.providerData&&this.providerData.length));},t.Ac=function(t){return Li("firebase.User.prototype.reauthenticateAndRetrieveDataWithCredential is deprecated. Please use firebase.User.prototype.reauthenticateWithCredential instead."),this.hb(t)},t.hb=function(t){var e=this,n=null;return rh(this,t.f(this.a,this.uid).then(function(t){return $c(e,t),n=Qc(e,t,"reauthenticate"),e.h=null,e.reload()}).then(function(){return n}),!0)},t.rc=function(t){return Li("firebase.User.prototype.linkAndRetrieveDataWithCredential is deprecated. Please use firebase.User.prototype.linkWithCredential instead."),this.fb(t)},t.fb=function(e){var n=this,i=null;return rh(this,Zc(this,e.providerId).then(function(){return n.G()}).then(function(t){return e.b(n.a,t)}).then(function(t){return i=Qc(n,t,"link"),th(n,t)}).then(function(){return i}))},t.sc=function(t,e){var n=this;return rh(this,Zc(this,"phone").then(function(){return Ic(Mc(n),t,e,I(n.fb,n))}))},t.Bc=function(t,e){var n=this;return rh(this,Yt().then(function(){return Ic(Mc(n),t,e,I(n.hb,n))}),!0)},t.rb=function(e){var n=this;return rh(this,this.G().then(function(t){return n.a.rb(t,e)}).then(function(t){return $c(n,t),n.reload()}))},t.Sc=function(e){var n=this;return rh(this,this.G().then(function(t){return e.b(n.a,t)}).then(function(t){return $c(n,t),n.reload()}))},t.sb=function(e){var n=this;return rh(this,this.G().then(function(t){return n.a.sb(t,e)}).then(function(t){return $c(n,t),n.reload()}))},t.tb=function(e){if(void 0===e.displayName&&void 0===e.photoURL)return Bc(this);var n=this;return rh(this,this.G().then(function(t){return n.a.tb(t,{displayName:e.displayName,photoUrl:e.photoURL})}).then(function(t){return $c(n,t),Jc(n,"displayName",t.displayName||null),Jc(n,"photoURL",t.photoUrl||null),M(n.providerData,function(t){"password"===t.providerId&&(Mi(t,"displayName",n.displayName),Mi(t,"photoURL",n.photoURL));}),Fc(n)}).then(Hc))},t.Qc=function(e){var n=this;return rh(this,zc(this).then(function(t){return V(Gc(n),e)?function(t,e,n){return Ns(t,os,{idToken:e,deleteProvider:n})}(n.a,t,[e]).then(function(t){var e={};return M(t.providerUserInfo||[],function(t){e[t.providerId]=!0;}),M(Gc(n),function(t){e[t]||Xc(n,t);}),e[mo.PROVIDER_ID]||Mi(n,"phoneNumber",null),Fc(n)}):Fc(n).then(function(){throw new Yi("no-such-provider")})}))},t.delete=function(){var e=this;return rh(this,this.G().then(function(t){return Ns(e.a,rs,{idToken:t})}).then(function(){e.dispatchEvent(new Rc("userDeleted"));})).then(function(){for(var t=0;t<e.I.length;t++)e.I[t].cancel("app-deleted");Dc(e,null),xc(e,null),e.I=[],e.B=!0,Uc(e),Mi(e,"refreshToken",null),e.i&&rc(e.i,e);})},t.xb=function(t,e){return !!("linkViaPopup"==t&&(this.g||null)==e&&this.f||"reauthViaPopup"==t&&(this.g||null)==e&&this.f||"linkViaRedirect"==t&&(this.ca||null)==e||"reauthViaRedirect"==t&&(this.ca||null)==e)},t.ja=function(t,e,n,i){"linkViaPopup"!=t&&"reauthViaPopup"!=t||i!=(this.g||null)||(n&&this.v?this.v(n):e&&!n&&this.f&&this.f(e),this.c&&(this.c.cancel(),this.c=null),delete this.f,delete this.v);},t.Ba=function(t,e){return "linkViaPopup"==t&&e==(this.g||null)?I(this.Bb,this):"reauthViaPopup"==t&&e==(this.g||null)?I(this.Cb,this):"linkViaRedirect"==t&&(this.ca||null)==e?I(this.Bb,this):"reauthViaRedirect"==t&&(this.ca||null)==e?I(this.Cb,this):null},t.tc=function(t){var e=this;return eh(this,"linkViaPopup",t,function(){return Zc(e,t.providerId).then(function(){return Fc(e)})},!1)},t.Cc=function(t){return eh(this,"reauthViaPopup",t,function(){return Yt()},!0)},t.uc=function(t){var e=this;return nh(this,"linkViaRedirect",t,function(){return Zc(e,t.providerId)},!1)},t.Dc=function(t){return nh(this,"reauthViaRedirect",t,function(){return Yt()},!0)},t.Bb=function(e,n,t,i){var r=this;this.c&&(this.c.cancel(),this.c=null);var o=null;return t=this.G().then(function(t){return $a(r.a,{requestUri:e,postBody:i,sessionId:n,idToken:t})}).then(function(t){return o=Qc(r,t,"link"),th(r,t)}).then(function(){return o}),rh(this,t)},t.Cb=function(t,e,n,i){var r=this;this.c&&(this.c.cancel(),this.c=null);var o=null;return rh(this,Yt().then(function(){return Hr(Za(r.a,{requestUri:t,sessionId:e,postBody:i,tenantId:n}),r.uid)}).then(function(t){return o=Qc(r,t,"reauthenticate"),$c(r,t),r.h=null,r.reload()}).then(function(){return o}),!0)},t.jb=function(e){var n=this,i=null;return rh(this,this.G().then(function(t){return i=t,void 0===e||G(e)?{}:br(new ur(e))}).then(function(t){return n.a.jb(i,t)}).then(function(t){if(n.email!=t)return n.reload()}).then(function(){}))},t.toJSON=function(){return this.A()},t.A=function(){var e={uid:this.uid,displayName:this.displayName,photoURL:this.photoURL,email:this.email,emailVerified:this.emailVerified,phoneNumber:this.phoneNumber,isAnonymous:this.isAnonymous,tenantId:this.tenantId,providerData:[],apiKey:this.l,appName:this.m,authDomain:this.o,stsTokenManager:this.b.A(),redirectEventId:this.ca||null};return this.metadata&&J(e,this.metadata.A()),M(this.providerData,function(t){e.providerData.push(function(t){var e,n={};for(e in t)t.hasOwnProperty(e)&&(n[e]=t[e]);return n}(t));}),e};var sh={name:"redirectUser",C:"session"};function uh(t){return Nu(t.b,sh,t.a)}function ch(t){this.a=t,this.b=ku(),this.c=null,this.f=function(e){var n=fh("local"),i=fh("session"),r=fh("none");return function(n,i,r){var o=Su(i,r),a=Au(n,i.C);return n.get(i,r).then(function(t){var e=null;try{e=ki(l.localStorage.getItem(o));}catch(t){}if(e&&!t)return l.localStorage.removeItem(o),n.set(i,e,r);e&&t&&"localStorage"!=a.type&&l.localStorage.removeItem(o);})}(e.b,n,e.a).then(function(){return e.b.get(i,e.a)}).then(function(t){return t?i:e.b.get(r,e.a).then(function(t){return t?r:e.b.get(n,e.a).then(function(t){return t?n:e.b.get(lh,e.a).then(function(t){return t?fh(t):n})})})}).then(function(t){return e.c=t,hh(e,t.C)}).s(function(){e.c||(e.c=n);})}(this),this.b.addListener(fh("local"),this.a,I(this.g,this));}function hh(t,e){var n,i=[];for(n in Tu)Tu[n]!==e&&i.push(Nu(t.b,fh(Tu[n]),t.a));return i.push(Nu(t.b,lh,t.a)),function(s){return new qt(function(n,e){var i=s.length,r=[];if(i)for(var t=function(t,e){i--,r[t]=e,0==i&&n(r);},o=function(t){e(t);},a=0;a<s.length;a++)$t(s[a],T(t,a),o);else n(r);})}(i)}ch.prototype.g=function(){var e=this,n=fh("local");mh(this,function(){return Yt().then(function(){return e.c&&"local"!=e.c.C?e.b.get(n,e.a):null}).then(function(t){if(t)return hh(e,"local").then(function(){e.c=n;})})});};var lh={name:"persistence",C:"session"};function fh(t){return {name:"authUser",C:t}}function dh(t,e){return mh(t,function(){return t.b.set(t.c,e.A(),t.a)})}function ph(t){return mh(t,function(){return Nu(t.b,t.c,t.a)})}function vh(t,e){return mh(t,function(){return t.b.get(t.c,t.a).then(function(t){return t&&e&&(t.authDomain=e),oh(t||{})})})}function mh(t,e){return t.f=t.f.then(e,e),t.f}function gh(t){if(this.l=!1,Mi(this,"settings",new yc),Mi(this,"app",t),!Ah(this).options||!Ah(this).options.apiKey)throw new Yi("invalid-api-key");t=fl.SDK_VERSION?pi(fl.SDK_VERSION):null,this.b=new Pa(Ah(this).options&&Ah(this).options.apiKey,Nr(Ar),t),this.O=[],this.m=[],this.J=[],this.Ub=fl.INTERNAL.createSubscribe(I(this.oc,this)),this.W=void 0,this.Vb=fl.INTERNAL.createSubscribe(I(this.pc,this)),Eh(this,null),this.h=new ch(Ah(this).options.apiKey+":"+Ah(this).name),this.w=new ah(Ah(this).options.apiKey+":"+Ah(this).name),this.Y=_h(this,function(n){var t=Ah(n).options.authDomain,e=function(e){var t=function(t,e){return t.b.get(sh,t.a).then(function(t){return t&&e&&(t.authDomain=e),oh(t||{})})}(e.w,Ah(e).options.authDomain).then(function(t){return (e.B=t)&&(t.da=e.w),uh(e.w)});return _h(e,t)}(n).then(function(){return vh(n.h,t)}).then(function(e){return e?(e.da=n.w,n.B&&(n.B.ca||null)==(e.ca||null)?e:e.reload().then(function(){return dh(n.h,e).then(function(){return e})}).s(function(t){return "auth/network-request-failed"==t.code?e:ph(n.h)})):null}).then(function(t){Eh(n,t||null);});return _h(n,e)}(this)),this.i=_h(this,function(e){return e.Y.then(function(){return Ih(e)}).s(function(){}).then(function(){if(!e.l)return e.ma()}).s(function(){}).then(function(){if(!e.l){e.ga=!0;var t=e.h;t.b.addListener(fh("local"),t.a,e.ma);}})}(this)),this.ga=!1,this.ma=I(this.Nc,this),this.ub=I(this.aa,this),this.wa=I(this.bc,this),this.xa=I(this.mc,this),this.Ja=I(this.nc,this),this.a=null,function(e){var n=Ah(e).options.authDomain,i=Ah(e).options.apiKey;n&&bi()&&(e.Tb=e.Y.then(function(){if(!e.l){if(e.a=fc(n,i,Ah(e).name),ic(e.a,e),Sh(e)&&Kc(Sh(e)),e.B){Kc(e.B);var t=e.B;t.ua(e.ha()),Dc(t,e),Lc(t=e.B,e.I),xc(t,e),e.B=null;}return e.a}}));}(this),this.INTERNAL={},this.INTERNAL.delete=I(this.delete,this),this.INTERNAL.logFramework=I(this.vc,this),this.o=0,nn.call(this),function(t){Object.defineProperty(t,"lc",{get:function(){return this.ha()},set:function(t){this.ua(t);},enumerable:!1}),t.Z=null,Object.defineProperty(t,"ti",{get:function(){return this.R()},set:function(t){this.nb(t);},enumerable:!1}),t.P=null;}(this),this.I=[];}function bh(t){Ce.call(this,"languageCodeChanged"),this.g=t;}function yh(t){Ce.call(this,"frameworkChanged"),this.c=t;}function wh(t){return t.Tb||zt(new Yi("auth-domain-config-required"))}function Ih(t){if(!bi())return zt(new Yi("operation-not-supported-in-this-environment"));var e=wh(t).then(function(){return t.a.oa()}).then(function(t){return t?Ui(t):null});return _h(t,e)}function Th(e,t){var n={};return n.apiKey=Ah(e).options.apiKey,n.authDomain=Ah(e).options.authDomain,n.appName=Ah(e).name,e.Y.then(function(){return function(t,e,n,i){var r=new Cc(t,e);return n&&(r.da=n),i&&Lc(r,i),r.reload().then(function(){return r})}(n,t,e.w,e.Ca())}).then(function(t){return Sh(e)&&t.uid==Sh(e).uid?Yc(Sh(e),t):(Eh(e,t),Kc(t)),e.aa(t)}).then(function(){Oh(e);})}function Eh(t,e){Sh(t)&&(function(t,e){K(t.O,function(t){return t==e});}(Sh(t),t.ub),Xe(Sh(t),"tokenChanged",t.wa),Xe(Sh(t),"userDeleted",t.xa),Xe(Sh(t),"userInvalidated",t.Ja),Uc(Sh(t))),e&&(e.O.push(t.ub),Be(e,"tokenChanged",t.wa),Be(e,"userDeleted",t.xa),Be(e,"userInvalidated",t.Ja),0<t.o&&jc(e)),Mi(t,"currentUser",e),e&&(e.ua(t.ha()),Dc(e,t),Lc(e,t.I),xc(e,t));}function kh(e,t){var n=null,i=null;return _h(e,t.then(function(t){return n=bo(t),i=Cr(t),Th(e,t)}).then(function(){return Ui({user:Sh(e),credential:n,additionalUserInfo:i,operationType:"signIn"})}))}function Ah(t){return t.app}function Sh(t){return t.currentUser}function Nh(t){return Sh(t)&&Sh(t)._lat||null}function Oh(t){if(t.ga){for(var e=0;e<t.m.length;e++)t.m[e]&&t.m[e](Nh(t));if(t.W!==t.getUid()&&t.J.length)for(t.W=t.getUid(),e=0;e<t.J.length;e++)t.J[e]&&t.J[e](Nh(t));}}function _h(t,e){return t.O.push(e),e.ka(function(){F(t.O,e);}),e}function Ph(){}function Rh(){this.a={},this.b=1e12;}ch.prototype.mb=function(e){var n=null,i=this;return function(t){var e=new Yi("invalid-persistence-type"),n=new Yi("unsupported-persistence-type");t:{for(i in Tu)if(Tu[i]==t){var i=!0;break t}i=!1;}if(!i||"string"!=typeof t)throw e;switch(ui()){case"ReactNative":if("session"===t)throw n;break;case"Node":if("none"!==t)throw n;break;default:if(!gi()&&"none"!==t)throw n}}(e),mh(this,function(){return e!=i.c.C?i.b.get(i.c,i.a).then(function(t){return n=t,hh(i,e)}).then(function(){if(i.c=fh(e),n)return i.b.set(i.c,n,i.a)}):Yt()})},k(gh,nn),k(bh,Ce),k(yh,Ce),(t=gh.prototype).mb=function(t){return t=this.h.mb(t),_h(this,t)},t.ua=function(t){this.Z===t||this.l||(this.Z=t,ja(this.b,this.Z),this.dispatchEvent(new bh(this.ha())));},t.ha=function(){return this.Z},t.Tc=function(){var t=l.navigator;this.ua(t&&(t.languages&&t.languages[0]||t.language||t.userLanguage)||null);},t.vc=function(t){this.I.push(t),Ua(this.b,fl.SDK_VERSION?pi(fl.SDK_VERSION,this.I):null),this.dispatchEvent(new yh(this.I));},t.Ca=function(){return H(this.I)},t.nb=function(t){this.P===t||this.l||(this.P=t,this.b.b=this.P);},t.R=function(){return this.P},t.toJSON=function(){return {apiKey:Ah(this).options.apiKey,authDomain:Ah(this).options.authDomain,appName:Ah(this).name,currentUser:Sh(this)&&Sh(this).A()}},t.xb=function(t,e){switch(t){case"unknown":case"signInViaRedirect":return !0;case"signInViaPopup":return this.g==e&&!!this.f;default:return !1}},t.ja=function(t,e,n,i){"signInViaPopup"==t&&this.g==i&&(n&&this.v?this.v(n):e&&!n&&this.f&&this.f(e),this.c&&(this.c.cancel(),this.c=null),delete this.f,delete this.v);},t.Ba=function(t,e){return "signInViaRedirect"==t||"signInViaPopup"==t&&this.g==e&&this.f?I(this.ac,this):null},t.ac=function(t,e,n,i){var r=this;t={requestUri:t,postBody:i,sessionId:e,tenantId:n},this.c&&(this.c.cancel(),this.c=null);var o=null,a=null,s=za(r.b,t).then(function(t){return o=bo(t),a=Cr(t),t});return _h(this,t=r.Y.then(function(){return s}).then(function(t){return Th(r,t)}).then(function(){return Ui({user:Sh(r),credential:o,additionalUserInfo:a,operationType:"signIn"})}))},t.Lc=function(e){if(!bi())return zt(new Yi("operation-not-supported-in-this-environment"));var n=this,t=Rr(e.providerId),i=Ai(),r=null;(!Ii()||ai())&&Ah(this).options.authDomain&&e.isOAuthProvider&&(r=qs(Ah(this).options.authDomain,Ah(this).options.apiKey,Ah(this).name,"signInViaPopup",e,null,i,fl.SDK_VERSION||null,null,null,this.R()));var o=ei(r,t&&t.sa,t&&t.ra);return _h(this,t=wh(this).then(function(t){return sc(t,o,"signInViaPopup",e,i,!!r,n.R())}).then(function(){return new qt(function(t,e){n.ja("signInViaPopup",null,new Yi("cancelled-popup-request"),n.g),n.f=t,n.v=e,n.g=i,n.c=hc(n.a,n,"signInViaPopup",o,i);})}).then(function(t){return o&&ti(o),t?Ui(t):null}).s(function(t){throw o&&ti(o),t}))},t.Mc=function(t){if(!bi())return zt(new Yi("operation-not-supported-in-this-environment"));var e=this;return _h(this,wh(this).then(function(){return function(t){return mh(t,function(){return t.b.set(lh,t.c.C,t.a)})}(e.h)}).then(function(){return cc(e.a,"signInViaRedirect",t,void 0,e.R())}))},t.oa=function(){var e=this;return Ih(this).then(function(t){return e.a&&vc(e.a.b),t}).s(function(t){throw e.a&&vc(e.a.b),t})},t.Rc=function(t){if(!t)return zt(new Yi("null-user"));if(this.P!=t.tenantId)return zt(new Yi("tenant-id-mismatch"));var e=this,n={};n.apiKey=Ah(this).options.apiKey,n.authDomain=Ah(this).options.authDomain,n.appName=Ah(this).name;var i=function(t,e,n,i){e=e||{apiKey:t.l,authDomain:t.o,appName:t.m};var r=t.b,o={};return o[Ca]=r.b,o.refreshToken=r.a,o.expiresIn=(r.c-E())/1e3,e=new Cc(e,o),n&&(e.da=n),i&&Lc(e,i),Yc(e,t),e}(t,n,e.w,e.Ca());return _h(this,this.i.then(function(){if(Ah(e).options.apiKey!=t.l)return i.reload()}).then(function(){return Sh(e)&&t.uid==Sh(e).uid?(Yc(Sh(e),t),e.aa(t)):(Eh(e,i),Kc(i),e.aa(i))}).then(function(){Oh(e);}))},t.pb=function(){var t=this,e=this.i.then(function(){return t.a&&vc(t.a.b),Sh(t)?(Eh(t,null),ph(t.h).then(function(){Oh(t);})):Yt()});return _h(this,e)},t.Nc=function(){var i=this;return vh(this.h,Ah(this).options.authDomain).then(function(t){if(!i.l){var e;if(e=Sh(i)&&t){e=Sh(i).uid;var n=t.uid;e=null!=e&&""!==e&&null!=n&&""!==n&&e==n;}if(e)return Yc(Sh(i),t),Sh(i).G();(Sh(i)||t)&&(Eh(i,t),t&&(Kc(t),t.da=i.w),i.a&&ic(i.a,i),Oh(i));}})},t.aa=function(t){return dh(this.h,t)},t.bc=function(){Oh(this),this.aa(Sh(this));},t.mc=function(){this.pb();},t.nc=function(){this.pb();},t.oc=function(t){var e=this;this.addAuthTokenListener(function(){t.next(Sh(e));});},t.pc=function(t){var e=this;!function(t,e){t.J.push(e),_h(t,t.i.then(function(){!t.l&&V(t.J,e)&&t.W!==t.getUid()&&(t.W=t.getUid(),e(Nh(t)));}));}(this,function(){t.next(Sh(e));});},t.xc=function(t,e,n){var i=this;return this.ga&&Promise.resolve().then(function(){m(t)?t(Sh(i)):m(t.next)&&t.next(Sh(i));}),this.Ub(t,e,n)},t.wc=function(t,e,n){var i=this;return this.ga&&Promise.resolve().then(function(){i.W=i.getUid(),m(t)?t(Sh(i)):m(t.next)&&t.next(Sh(i));}),this.Vb(t,e,n)},t.cc=function(t){var e=this,n=this.i.then(function(){return Sh(e)?Sh(e).G(t).then(function(t){return {accessToken:t}}):null});return _h(this,n)},t.Hc=function(t){var n=this;return this.i.then(function(){return kh(n,Ns(n.b,Ts,{token:t}))}).then(function(t){var e=t.user;return Jc(e,"isAnonymous",!1),n.aa(e),t})},t.Ic=function(t,e){var n=this;return this.i.then(function(){return kh(n,Ns(n.b,Es,{email:t,password:e}))})},t.Xb=function(t,e){var n=this;return this.i.then(function(){return kh(n,Ns(n.b,ns,{email:t,password:e}))})},t.Sa=function(t){var e=this;return this.i.then(function(){return kh(e,t.na(e.b))})},t.Gc=function(t){return Li("firebase.auth.Auth.prototype.signInAndRetrieveDataWithCredential is deprecated. Please use firebase.auth.Auth.prototype.signInWithCredential instead."),this.Sa(t)},t.ob=function(){var n=this;return this.i.then(function(){var t=Sh(n);return t&&t.isAnonymous?Ui({user:t,credential:null,additionalUserInfo:Ui({providerId:null,isNewUser:!1}),operationType:"signIn"}):kh(n,n.b.ob()).then(function(t){var e=t.user;return Jc(e,"isAnonymous",!0),n.aa(e),t})})},t.getUid=function(){return Sh(this)&&Sh(this).uid||null},t.Wb=function(t){this.addAuthTokenListener(t),this.o++,0<this.o&&Sh(this)&&jc(Sh(this));},t.Ec=function(e){var n=this;M(this.m,function(t){t==e&&n.o--;}),this.o<0&&(this.o=0),0==this.o&&Sh(this)&&Uc(Sh(this)),this.removeAuthTokenListener(e);},t.addAuthTokenListener=function(t){var e=this;this.m.push(t),_h(this,this.i.then(function(){e.l||V(e.m,t)&&t(Nh(e));}));},t.removeAuthTokenListener=function(e){K(this.m,function(t){return t==e});},t.delete=function(){this.l=!0;for(var t=0;t<this.O.length;t++)this.O[t].cancel("app-deleted");return this.O=[],this.h&&(t=this.h).b.removeListener(fh("local"),t.a,this.ma),this.a&&(rc(this.a,this),vc(this.a.b)),Promise.resolve()},t.$b=function(t){return _h(this,function(t,e){return Ns(t,is,{identifier:e,continueUri:yi()?$n():"http://localhost"}).then(function(t){return t.signinMethods||[]})}(this.b,t))},t.qc=function(t){return !!lo(t)},t.lb=function(e,n){var i=this;return _h(this,Yt().then(function(){var t=new ur(n);if(!t.c)throw new Yi("argument-error",lr+" must be true when sending sign in link to email");return br(t)}).then(function(t){return i.b.lb(e,t)}).then(function(){}))},t.Uc=function(t){return this.Ma(t).then(function(t){return t.data.email})},t.ab=function(t,e){return _h(this,this.b.ab(t,e).then(function(){}))},t.Ma=function(t){return _h(this,this.b.Ma(t).then(function(t){return new Fi(t)}))},t.Ya=function(t){return _h(this,this.b.Ya(t).then(function(){}))},t.kb=function(e,t){var n=this;return _h(this,Yt().then(function(){return void 0===t||G(t)?{}:br(new ur(t))}).then(function(t){return n.b.kb(e,t)}).then(function(){}))},t.Kc=function(t,e){return _h(this,Ic(this,t,e,I(this.Sa,this)))},t.Jc=function(n,i){var r=this;return _h(this,Yt().then(function(){var t=i||$n(),e=ho(n,t);if(!(t=lo(t)))throw new Yi("argument-error","Invalid email link!");if(t.tenantId!==r.R())throw new Yi("tenant-id-mismatch");return r.Sa(e)}))},Ph.prototype.render=function(){},Ph.prototype.reset=function(){},Ph.prototype.getResponse=function(){},Ph.prototype.execute=function(){};var Ch=null;function Dh(t,e){return (e=Lh(e))&&t.a[e]||null}function Lh(t){return (t=void 0===t?1e12:t)?t.toString():null}function xh(t,e){this.g=!1,this.c=e,this.a=this.b=null,this.h="invisible"!==this.c.size,this.f=Fn(t);var n=this;this.i=function(){n.execute();},this.h?this.execute():Be(this.f,"click",this.i);}function Mh(t){if(t.g)throw Error("reCAPTCHA mock was already deleted!")}function jh(){}Rh.prototype.render=function(t,e){return this.a[this.b.toString()]=new xh(t,e),this.b++},Rh.prototype.reset=function(t){var e=Dh(this,t);t=Lh(t),e&&t&&(e.delete(),delete this.a[t]);},Rh.prototype.getResponse=function(t){return (t=Dh(this,t))?t.getResponse():null},Rh.prototype.execute=function(t){(t=Dh(this,t))&&t.execute();},xh.prototype.getResponse=function(){return Mh(this),this.b},xh.prototype.execute=function(){Mh(this);var n=this;this.a||(this.a=setTimeout(function(){n.b=function(){for(var t=50,e=[];0<t;)e.push("1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".charAt(Math.floor(62*Math.random()))),t--;return e.join("")}();var t=n.c.callback,e=n.c["expired-callback"];if(t)try{t(n.b);}catch(t){}n.a=setTimeout(function(){if(n.a=null,n.b=null,e)try{e();}catch(t){}n.h&&n.execute();},6e4);},500));},xh.prototype.delete=function(){Mh(this),this.g=!0,clearTimeout(this.a),this.a=null,Xe(this.f,"click",this.i);},jh.prototype.g=function(){return Yt(Ch=Ch||new Rh)},jh.prototype.c=function(){};var Uh=null;function Vh(){this.b=l.grecaptcha?1/0:0,this.f=null,this.a="__rcb"+Math.floor(1e6*Math.random()).toString();}var Fh=new Y(Z,"https://www.google.com/recaptcha/api.js?onload=%{onload}&render=explicit&hl=%{hl}"),Kh=new Oi(3e4,6e4);Vh.prototype.g=function(r){var o=this;return new qt(function(t,e){var i=setTimeout(function(){e(new Yi("network-request-failed"));},Kh.get());!l.grecaptcha||r!==o.f&&!o.b?(l[o.a]=function(){if(l.grecaptcha){o.f=r;var n=l.grecaptcha.render;l.grecaptcha.render=function(t,e){return t=n(t,e),o.b++,t},clearTimeout(i),t(l.grecaptcha);}else clearTimeout(i),e(new Yi("internal-error"));delete l[o.a];},Yt(Ea(nt(Fh,{onload:o.a,hl:r||""}))).s(function(){clearTimeout(i),e(new Yi("internal-error","Unable to load external reCAPTCHA dependencies!"));})):(clearTimeout(i),t(l.grecaptcha));})},Vh.prototype.c=function(){this.b--;};var qh=null;function Hh(t,e,n,i,r,o,a){if(Mi(this,"type","recaptcha"),this.c=this.f=null,this.B=!1,this.u=e,this.g=null,a=a?Uh=Uh||new jh:qh=qh||new Vh,this.m=a,this.a=n||{theme:"light",type:"image"},this.h=[],this.a[Wh])throw new Yi("argument-error","sitekey should not be provided for reCAPTCHA as one is automatically provisioned for the current project.");if(this.i="invisible"===this.a[Xh],!l.document)throw new Yi("operation-not-supported-in-this-environment","RecaptchaVerifier is only supported in a browser HTTP/HTTPS environment with DOM support.");if(!Fn(e)||!this.i&&Fn(e).hasChildNodes())throw new Yi("argument-error","reCAPTCHA container is either not found or already contains inner elements!");this.o=new Pa(t,o||null,r||null),this.v=i||function(){return null};var s=this;this.l=[];var u=this.a[Bh];this.a[Bh]=function(t){if(Jh(s,t),"function"==typeof u)u(t);else if("string"==typeof u){var e=mi(u,l);"function"==typeof e&&e(t);}};var c=this.a[Gh];this.a[Gh]=function(){if(Jh(s,null),"function"==typeof c)c();else if("string"==typeof c){var t=mi(c,l);"function"==typeof t&&t();}};}var Bh="callback",Gh="expired-callback",Wh="sitekey",Xh="size";function Jh(t,e){for(var n=0;n<t.l.length;n++)try{t.l[n](e);}catch(t){}}function Yh(t,e){return t.h.push(e),e.ka(function(){F(t.h,e);}),e}function zh(t){if(t.B)throw new Yi("internal-error","RecaptchaVerifier instance has been destroyed.")}function $h(t,e,n){var i=!1;try{this.b=n||fl.app();}catch(t){throw new Yi("argument-error","No firebase.app.App instance is currently initialized.")}if(!this.b.options||!this.b.options.apiKey)throw new Yi("invalid-api-key");n=this.b.options.apiKey;var r=this,o=null;try{o=this.b.auth().Ca();}catch(t){}try{i=this.b.auth().settings.appVerificationDisabledForTesting;}catch(t){}o=fl.SDK_VERSION?pi(fl.SDK_VERSION,o):null,Hh.call(this,n,t,e,function(){try{var e=r.b.auth().ha();}catch(t){e=null;}return e},o,Nr(Ar),i);}function Zh(t,e,n,i){t:{n=Array.prototype.slice.call(n);for(var r=0,o=!1,a=0;a<e.length;a++)if(e[a].optional)o=!0;else{if(o)throw new Yi("internal-error","Argument validator encountered a required argument after an optional argument.");r++;}if(o=e.length,n.length<r||o<n.length)i="Expected "+(r==o?1==r?"1 argument":r+" arguments":r+"-"+o+" arguments")+" but got "+n.length+".";else{for(r=0;r<n.length;r++)if(o=e[r].optional&&void 0===n[r],!e[r].N(n[r])&&!o){if(e=e[r],r<0||r>=Qh.length)throw new Yi("internal-error","Argument validator received an unsupported number of arguments.");n=Qh[r],i=(i?"":n+" argument ")+(e.name?'"'+e.name+'" ':"")+"must be "+e.M+".";break t}i=null;}}if(i)throw new Yi("argument-error",t+" failed: "+i)}(t=Hh.prototype).Da=function(){var e=this;return this.f?this.f:this.f=Yh(this,Yt().then(function(){if(yi()&&!si())return ri();throw new Yi("operation-not-supported-in-this-environment","RecaptchaVerifier is only supported in a browser HTTP/HTTPS environment.")}).then(function(){return e.m.g(e.v())}).then(function(t){return e.g=t,Ns(e.o,ds,{})}).then(function(t){e.a[Wh]=t.recaptchaSiteKey;}).s(function(t){throw e.f=null,t}))},t.render=function(){zh(this);var n=this;return Yh(this,this.Da().then(function(){if(null===n.c){var t=n.u;if(!n.i){var e=Fn(t);t=Hn("DIV"),e.appendChild(t);}n.c=n.g.render(t,n.a);}return n.c}))},t.verify=function(){zh(this);var r=this;return Yh(this,this.render().then(function(i){return new qt(function(e){var t=r.g.getResponse(i);if(t)e(t);else{var n=function(t){t&&(function(t,e){K(t.l,function(t){return t==e});}(r,n),e(t));};r.l.push(n),r.i&&r.g.execute(r.c);}})}))},t.reset=function(){zh(this),null!==this.c&&this.g.reset(this.c);},t.clear=function(){zh(this),this.B=!0,this.m.c();for(var t=0;t<this.h.length;t++)this.h[t].cancel("RecaptchaVerifier instance has been destroyed.");if(!this.i){t=Fn(this.u);for(var e;e=t.firstChild;)t.removeChild(e);}},k($h,Hh);var Qh="First Second Third Fourth Fifth Sixth Seventh Eighth Ninth".split(" ");function tl(t,e){return {name:t||"",M:"a valid string",optional:!!e,N:h}}function el(t,e){return {name:t||"",M:"a boolean",optional:!!e,N:n}}function nl(t,e){return {name:t||"",M:"a valid object",optional:!!e,N:g}}function il(t,e){return {name:t||"",M:"a function",optional:!!e,N:m}}function rl(t,e){return {name:t||"",M:"null",optional:!!e,N:r}}function ol(n){return {name:n?n+"Credential":"credential",M:n?"a valid "+n+" credential":"a valid credential",optional:!1,N:function(t){if(!t)return !1;var e=!n||t.providerId===n;return !(!t.na||!e)}}}function al(){return {name:"applicationVerifier",M:"an implementation of firebase.auth.ApplicationVerifier",optional:!1,N:function(t){return !!(t&&h(t.type)&&m(t.verify))}}}function sl(e,n,t,i){return {name:t||"",M:e.M+" or "+n.M,optional:!!i,N:function(t){return e.N(t)||n.N(t)}}}function ul(t,e){for(var n in e){var i=e[n].name;t[i]=ll(i,t[n],e[n].j);}}function cl(t,e){for(var n in e){var i=e[n].name;i!==n&&Object.defineProperty(t,i,{get:T(function(t){return this[t]},n),set:T(function(t,e,n,i){Zh(t,[n],[i],!0),this[e]=i;},i,n,e[n].Za),enumerable:!0});}}function hl(t,e,n,i){t[e]=ll(e,n,i);}function ll(t,e,n){function i(){var t=Array.prototype.slice.call(arguments);return Zh(o,n,t),e.apply(this,t)}if(!n)return e;var r,o=function(t){return (t=t.split("."))[t.length-1]}(t);for(r in e)i[r]=e[r];for(r in e.prototype)i.prototype[r]=e.prototype[r];return i}ul(gh.prototype,{Ya:{name:"applyActionCode",j:[tl("code")]},Ma:{name:"checkActionCode",j:[tl("code")]},ab:{name:"confirmPasswordReset",j:[tl("code"),tl("newPassword")]},Xb:{name:"createUserWithEmailAndPassword",j:[tl("email"),tl("password")]},$b:{name:"fetchSignInMethodsForEmail",j:[tl("email")]},oa:{name:"getRedirectResult",j:[]},qc:{name:"isSignInWithEmailLink",j:[tl("emailLink")]},wc:{name:"onAuthStateChanged",j:[sl(nl(),il(),"nextOrObserver"),il("opt_error",!0),il("opt_completed",!0)]},xc:{name:"onIdTokenChanged",j:[sl(nl(),il(),"nextOrObserver"),il("opt_error",!0),il("opt_completed",!0)]},kb:{name:"sendPasswordResetEmail",j:[tl("email"),sl(nl("opt_actionCodeSettings",!0),rl(null,!0),"opt_actionCodeSettings",!0)]},lb:{name:"sendSignInLinkToEmail",j:[tl("email"),nl("actionCodeSettings")]},mb:{name:"setPersistence",j:[tl("persistence")]},Gc:{name:"signInAndRetrieveDataWithCredential",j:[ol()]},ob:{name:"signInAnonymously",j:[]},Sa:{name:"signInWithCredential",j:[ol()]},Hc:{name:"signInWithCustomToken",j:[tl("token")]},Ic:{name:"signInWithEmailAndPassword",j:[tl("email"),tl("password")]},Jc:{name:"signInWithEmailLink",j:[tl("email"),tl("emailLink",!0)]},Kc:{name:"signInWithPhoneNumber",j:[tl("phoneNumber"),al()]},Lc:{name:"signInWithPopup",j:[{name:"authProvider",M:"a valid Auth provider",optional:!1,N:function(t){return !!(t&&t.providerId&&t.hasOwnProperty&&t.hasOwnProperty("isOAuthProvider"))}}]},Mc:{name:"signInWithRedirect",j:[{name:"authProvider",M:"a valid Auth provider",optional:!1,N:function(t){return !!(t&&t.providerId&&t.hasOwnProperty&&t.hasOwnProperty("isOAuthProvider"))}}]},Rc:{name:"updateCurrentUser",j:[sl({name:"user",M:"an instance of Firebase User",optional:!1,N:function(t){return !!(t&&t instanceof Cc)}},rl(),"user")]},pb:{name:"signOut",j:[]},toJSON:{name:"toJSON",j:[tl(null,!0)]},Tc:{name:"useDeviceLanguage",j:[]},Uc:{name:"verifyPasswordResetCode",j:[tl("code")]}}),cl(gh.prototype,{lc:{name:"languageCode",Za:sl(tl(),rl(),"languageCode")},ti:{name:"tenantId",Za:sl(tl(),rl(),"tenantId")}}),(gh.Persistence=Tu).LOCAL="local",gh.Persistence.SESSION="session",gh.Persistence.NONE="none",ul(Cc.prototype,{delete:{name:"delete",j:[]},dc:{name:"getIdTokenResult",j:[el("opt_forceRefresh",!0)]},G:{name:"getIdToken",j:[el("opt_forceRefresh",!0)]},rc:{name:"linkAndRetrieveDataWithCredential",j:[ol()]},fb:{name:"linkWithCredential",j:[ol()]},sc:{name:"linkWithPhoneNumber",j:[tl("phoneNumber"),al()]},tc:{name:"linkWithPopup",j:[{name:"authProvider",M:"a valid Auth provider",optional:!1,N:function(t){return !!(t&&t.providerId&&t.hasOwnProperty&&t.hasOwnProperty("isOAuthProvider"))}}]},uc:{name:"linkWithRedirect",j:[{name:"authProvider",M:"a valid Auth provider",optional:!1,N:function(t){return !!(t&&t.providerId&&t.hasOwnProperty&&t.hasOwnProperty("isOAuthProvider"))}}]},Ac:{name:"reauthenticateAndRetrieveDataWithCredential",j:[ol()]},hb:{name:"reauthenticateWithCredential",j:[ol()]},Bc:{name:"reauthenticateWithPhoneNumber",j:[tl("phoneNumber"),al()]},Cc:{name:"reauthenticateWithPopup",j:[{name:"authProvider",M:"a valid Auth provider",optional:!1,N:function(t){return !!(t&&t.providerId&&t.hasOwnProperty&&t.hasOwnProperty("isOAuthProvider"))}}]},Dc:{name:"reauthenticateWithRedirect",j:[{name:"authProvider",M:"a valid Auth provider",optional:!1,N:function(t){return !!(t&&t.providerId&&t.hasOwnProperty&&t.hasOwnProperty("isOAuthProvider"))}}]},reload:{name:"reload",j:[]},jb:{name:"sendEmailVerification",j:[sl(nl("opt_actionCodeSettings",!0),rl(null,!0),"opt_actionCodeSettings",!0)]},toJSON:{name:"toJSON",j:[tl(null,!0)]},Qc:{name:"unlink",j:[tl("provider")]},rb:{name:"updateEmail",j:[tl("email")]},sb:{name:"updatePassword",j:[tl("password")]},Sc:{name:"updatePhoneNumber",j:[ol("phone")]},tb:{name:"updateProfile",j:[nl("profile")]}}),ul(Rh.prototype,{execute:{name:"execute"},render:{name:"render"},reset:{name:"reset"},getResponse:{name:"getResponse"}}),ul(Ph.prototype,{execute:{name:"execute"},render:{name:"render"},reset:{name:"reset"},getResponse:{name:"getResponse"}}),ul(qt.prototype,{ka:{name:"finally"},s:{name:"catch"},then:{name:"then"}}),cl(yc.prototype,{appVerificationDisabled:{name:"appVerificationDisabledForTesting",Za:el("appVerificationDisabledForTesting")}}),ul(wc.prototype,{confirm:{name:"confirm",j:[tl("verificationCode")]}}),hl(qr,"fromJSON",function(t){t=h(t)?JSON.parse(t):t;for(var e,n=[Yr,uo,po,Wr],i=0;i<n.length;i++)if(e=n[i](t))return e;return null},[sl(tl(),nl(),"json")]),hl(co,"credential",function(t,e){return new so(t,e)},[tl("email"),tl("password")]),ul(so.prototype,{A:{name:"toJSON",j:[tl(null,!0)]}}),ul(Qr.prototype,{ya:{name:"addScope",j:[tl("scope")]},Ga:{name:"setCustomParameters",j:[nl("customOAuthParameters")]}}),hl(Qr,"credential",to,[sl(tl(),nl(),"token")]),hl(co,"credentialWithLink",ho,[tl("email"),tl("emailLink")]),ul(eo.prototype,{ya:{name:"addScope",j:[tl("scope")]},Ga:{name:"setCustomParameters",j:[nl("customOAuthParameters")]}}),hl(eo,"credential",no,[sl(tl(),nl(),"token")]),ul(io.prototype,{ya:{name:"addScope",j:[tl("scope")]},Ga:{name:"setCustomParameters",j:[nl("customOAuthParameters")]}}),hl(io,"credential",ro,[sl(tl(),sl(nl(),rl()),"idToken"),sl(tl(),rl(),"accessToken",!0)]),ul(oo.prototype,{Ga:{name:"setCustomParameters",j:[nl("customOAuthParameters")]}}),hl(oo,"credential",ao,[sl(tl(),nl(),"token"),tl("secret",!0)]),ul(Zr.prototype,{ya:{name:"addScope",j:[tl("scope")]},credential:{name:"credential",j:[sl(tl(),sl(nl(),rl()),"optionsOrIdToken"),sl(tl(),rl(),"accessToken",!0)]},Ga:{name:"setCustomParameters",j:[nl("customOAuthParameters")]}}),ul(Xr.prototype,{A:{name:"toJSON",j:[tl(null,!0)]}}),ul(Br.prototype,{A:{name:"toJSON",j:[tl(null,!0)]}}),hl(mo,"credential",go,[tl("verificationId"),tl("verificationCode")]),ul(mo.prototype,{Wa:{name:"verifyPhoneNumber",j:[tl("phoneNumber"),al()]}}),ul(fo.prototype,{A:{name:"toJSON",j:[tl(null,!0)]}}),ul(Yi.prototype,{toJSON:{name:"toJSON",j:[tl(null,!0)]}}),ul(So.prototype,{toJSON:{name:"toJSON",j:[tl(null,!0)]}}),ul(Ao.prototype,{toJSON:{name:"toJSON",j:[tl(null,!0)]}}),ul($h.prototype,{clear:{name:"clear",j:[]},render:{name:"render",j:[]},verify:{name:"verify",j:[]}}),hl(Qi,"parseLink",sr,[tl("link")]),function(){if(void 0===fl||!fl.INTERNAL||!fl.INTERNAL.registerComponent)throw Error("Cannot find the firebase namespace; be sure to include firebase-app.js before this library.");var t={ActionCodeInfo:{Operation:{EMAIL_SIGNIN:Ki,PASSWORD_RESET:"PASSWORD_RESET",RECOVER_EMAIL:"RECOVER_EMAIL",VERIFY_EMAIL:"VERIFY_EMAIL"}},Auth:gh,AuthCredential:qr,Error:Yi};hl(t,"EmailAuthProvider",co,[]),hl(t,"FacebookAuthProvider",Qr,[]),hl(t,"GithubAuthProvider",eo,[]),hl(t,"GoogleAuthProvider",io,[]),hl(t,"TwitterAuthProvider",oo,[]),hl(t,"OAuthProvider",Zr,[tl("providerId")]),hl(t,"SAMLAuthProvider",$r,[tl("providerId")]),hl(t,"PhoneAuthProvider",mo,[{name:"auth",M:"an instance of Firebase Auth",optional:!0,N:function(t){return !!(t&&t instanceof gh)}}]),hl(t,"RecaptchaVerifier",$h,[sl(tl(),{name:"",M:"an HTML element",optional:!1,N:function(t){return !!(t&&t instanceof Element)}},"recaptchaContainer"),nl("recaptchaParameters",!0),{name:"app",M:"an instance of Firebase App",optional:!0,N:function(t){return !!(t&&t instanceof fl.app.App)}}]),hl(t,"ActionCodeURL",Qi,[]),fl.INTERNAL.registerComponent({name:"auth",instanceFactory:function(t){return new gh(t=t.getProvider("app").getImmediate())},multipleInstances:!1,serviceProps:t,instantiationMode:"LAZY",type:"PUBLIC"}),fl.INTERNAL.registerComponent({name:"auth-internal",instanceFactory:function(t){return {getUid:I((t=t.getProvider("auth").getImmediate()).getUid,t),getToken:I(t.cc,t),addAuthTokenListener:I(t.Wb,t),removeAuthTokenListener:I(t.Ec,t)}},multipleInstances:!1,instantiationMode:"LAZY",type:"PRIVATE"}),fl.registerVersion("@firebase/auth","0.13.3"),fl.INTERNAL.extendNamespace({User:Cc});}();}.apply("undefined"!=typeof commonjsGlobal?commonjsGlobal:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{});}).apply(this,arguments);}catch(t){throw console.error(t),new Error("Cannot instantiate firebase-auth - be sure to load firebase-app.js first.")}});

    });

    var firebaseFunctions = createCommonjsModule(function (module, exports) {
    !function(e,t){t(index_cjs$2);}(commonjsGlobal,function(A){try{(function(){A=A&&A.hasOwnProperty("default")?A.default:A;var r=function(e,t){return (r=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,t){e.__proto__=t;}||function(e,t){for(var n in t)t.hasOwnProperty(n)&&(e[n]=t[n]);})(e,t)};function e(e,t){function n(){this.constructor=e;}r(e,t),e.prototype=null===t?Object.create(t):(n.prototype=t.prototype,new n);}function t(o,s,a,u){return new(a=a||Promise)(function(e,t){function n(e){try{i(u.next(e));}catch(e){t(e);}}function r(e){try{i(u.throw(e));}catch(e){t(e);}}function i(t){t.done?e(t.value):new a(function(e){e(t.value);}).then(n,r);}i((u=u.apply(o,s||[])).next());})}function p(n,r){var i,o,s,e,a={label:0,sent:function(){if(1&s[0])throw s[1];return s[1]},trys:[],ops:[]};return e={next:t(0),throw:t(1),return:t(2)},"function"==typeof Symbol&&(e[Symbol.iterator]=function(){return this}),e;function t(t){return function(e){return function(t){if(i)throw new TypeError("Generator is already executing.");for(;a;)try{if(i=1,o&&(s=2&t[0]?o.return:t[0]?o.throw||((s=o.return)&&s.call(o),0):o.next)&&!(s=s.call(o,t[1])).done)return s;switch(o=0,s&&(t=[2&t[0],s.value]),t[0]){case 0:case 1:s=t;break;case 4:return a.label++,{value:t[1],done:!1};case 5:a.label++,o=t[1],t=[0];continue;case 7:t=a.ops.pop(),a.trys.pop();continue;default:if(!(s=0<(s=a.trys).length&&s[s.length-1])&&(6===t[0]||2===t[0])){a=0;continue}if(3===t[0]&&(!s||t[1]>s[0]&&t[1]<s[3])){a.label=t[1];break}if(6===t[0]&&a.label<s[1]){a.label=s[1],s=t;break}if(s&&a.label<s[2]){a.label=s[2],a.ops.push(t);break}s[2]&&a.ops.pop(),a.trys.pop();continue}t=r.call(n,a);}catch(e){t=[6,e],o=0;}finally{i=s=0;}if(5&t[0])throw t[1];return {value:t[0]?t[1]:void 0,done:!0}}([t,e])}}}var i,d=(e(o,i=Error),o);function o(e,t){var n=i.call(this,t)||this;return n.code=e,n.name="FirebaseError",Object.setPrototypeOf(n,o.prototype),Error.captureStackTrace&&Error.captureStackTrace(n,s.prototype.create),n}var s=(n.prototype.create=function(e){for(var t=[],n=1;n<arguments.length;n++)t[n-1]=arguments[n];for(var r=t[0]||{},i=this.service+"/"+e,o=this.errors[e],s=o?function(e,r){return e.replace(h,function(e,t){var n=r[t];return null!=n?n.toString():"<"+t+"?>"})}(o,r):"Error",a=this.serviceName+": "+s+" ("+i+").",u=new d(i,a),c=0,l=Object.keys(r);c<l.length;c++){var f=l[c];"_"!==f.slice(-1)&&(f in u&&console.warn('Overwriting FirebaseError base field "'+f+'" can cause unexpected behavior.'),u[f]=r[f]);}return u},n);function n(e,t,n){this.service=e,this.serviceName=t,this.errors=n;}var h=/\{\$([^}]+)}/g,a=(u.prototype.setInstantiationMode=function(e){return this.instantiationMode=e,this},u.prototype.setMultipleInstances=function(e){return this.multipleInstances=e,this},u.prototype.setServiceProps=function(e){return this.serviceProps=e,this},u);function u(e,t,n){this.name=e,this.instanceFactory=t,this.type=n,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY";}var c,l={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"},v=(e(f,c=Error),f);function f(e,t,n){var r=c.call(this,t)||this;return Object.setPrototypeOf(r,f.prototype),r.code=e,r.details=n,r}function y(e,t,n){var r=function(e){if(200<=e&&e<300)return "ok";switch(e){case 0:return "internal";case 400:return "invalid-argument";case 401:return "unauthenticated";case 403:return "permission-denied";case 404:return "not-found";case 409:return "aborted";case 429:return "resource-exhausted";case 499:return "cancelled";case 500:return "internal";case 501:return "unimplemented";case 503:return "unavailable";case 504:return "deadline-exceeded"}return "unknown"}(e),i=r,o=void 0;try{var s=t&&t.error;if(s){var a=s.status;if("string"==typeof a){if(!l[a])return new v("internal","internal");r=l[a],i=a;}var u=s.message;"string"==typeof u&&(i=u),void 0!==(o=s.details)&&(o=n.decode(o));}}catch(e){}return "ok"===r?null:new v(r,i,o)}var g=(b.prototype.getAuthToken=function(){return t(this,void 0,void 0,function(){var t;return p(this,function(e){switch(e.label){case 0:if(!this.auth)return [2,void 0];e.label=1;case 1:return e.trys.push([1,3,,4]),[4,this.auth.getToken()];case 2:return (t=e.sent())?[2,t.accessToken]:[2,void 0];case 3:return e.sent(),[2,void 0];case 4:return [2]}})})},b.prototype.getInstanceIdToken=function(){return t(this,void 0,void 0,function(){var t;return p(this,function(e){switch(e.label){case 0:return e.trys.push([0,2,,3]),this.messaging?[4,this.messaging.getToken()]:[2,void 0];case 1:return (t=e.sent())?[2,t]:[2,void 0];case 2:return e.sent(),[2,void 0];case 3:return [2]}})})},b.prototype.getContext=function(){return t(this,void 0,void 0,function(){var t,n;return p(this,function(e){switch(e.label){case 0:return [4,this.getAuthToken()];case 1:return t=e.sent(),[4,this.getInstanceIdToken()];case 2:return n=e.sent(),[2,{authToken:t,instanceIdToken:n}]}})})},b);function b(e,t){var n=this;this.auth=null,this.messaging=null,this.auth=e.getImmediate({optional:!0}),this.messaging=t.getImmediate({optional:!0}),this.auth||e.get().then(function(e){return n.auth=e},function(){}),this.messaging||t.get().then(function(e){return n.messaging=e},function(){});}function m(e,t){var n={};for(var r in e)e.hasOwnProperty(r)&&(n[r]=t(e[r]));return n}var w=(E.prototype.encode=function(e){var t=this;if(null==e)return null;if(e instanceof Number&&(e=e.valueOf()),"number"==typeof e&&isFinite(e))return e;if(!0===e||!1===e)return e;if("[object String]"===Object.prototype.toString.call(e))return e;if(Array.isArray(e))return e.map(function(e){return t.encode(e)});if("function"==typeof e||"object"==typeof e)return m(e,function(e){return t.encode(e)});throw new Error("Data cannot be encoded in JSON: "+e)},E.prototype.decode=function(e){var t=this;if(null==e)return e;if(e["@type"])switch(e["@type"]){case"type.googleapis.com/google.protobuf.Int64Value":case"type.googleapis.com/google.protobuf.UInt64Value":var n=Number(e.value);if(isNaN(n))throw new Error("Data cannot be decoded from JSON: "+e);return n;default:throw new Error("Data cannot be decoded from JSON: "+e)}return Array.isArray(e)?e.map(function(e){return t.decode(e)}):"function"==typeof e||"object"==typeof e?m(e,function(e){return t.decode(e)}):e},E);function E(){}var O=(Object.defineProperty(N.prototype,"app",{get:function(){return this.app_},enumerable:!0,configurable:!0}),N.prototype._url=function(e){var t=this.app_.options.projectId,n=this.region_;return null===this.emulatorOrigin?"https://"+n+"-"+t+".cloudfunctions.net/"+e:this.emulatorOrigin+"/"+t+"/"+n+"/"+e},N.prototype.useFunctionsEmulator=function(e){this.emulatorOrigin=e;},N.prototype.httpsCallable=function(t,n){var r=this;return function(e){return r.call(t,e,n||{})}},N.prototype.postJSON=function(r,i,o){return t(this,void 0,void 0,function(){var t,n;return p(this,function(e){switch(e.label){case 0:o.append("Content-Type","application/json"),e.label=1;case 1:return e.trys.push([1,3,,4]),[4,fetch(r,{method:"POST",body:JSON.stringify(i),headers:o})];case 2:return t=e.sent(),[3,4];case 3:return e.sent(),[2,{status:0,json:null}];case 4:n=null,e.label=5;case 5:return e.trys.push([5,7,,8]),[4,t.json()];case 6:return n=e.sent(),[3,8];case 7:return e.sent(),[3,8];case 8:return [2,{status:t.status,json:n}]}})})},N.prototype.call=function(c,l,f){return t(this,void 0,void 0,function(){var t,n,r,i,o,s,a,u;return p(this,function(e){switch(e.label){case 0:return t=this._url(c),l=this.serializer.encode(l),n={data:l},r=new Headers,[4,this.contextProvider.getContext()];case 1:return (i=e.sent()).authToken&&r.append("Authorization","Bearer "+i.authToken),i.instanceIdToken&&r.append("Firebase-Instance-ID-Token",i.instanceIdToken),o=f.timeout||7e4,[4,Promise.race([this.postJSON(t,n,r),function(n){return new Promise(function(e,t){setTimeout(function(){t(new v("deadline-exceeded","deadline-exceeded"));},n);})}(o),this.cancelAllRequests])];case 2:if(!(s=e.sent()))throw new v("cancelled","Firebase Functions instance was deleted.");if(a=y(s.status,s.json,this.serializer))throw a;if(!s.json)throw new v("internal","Response is not valid JSON object.");if(void 0===(u=s.json.data)&&(u=s.json.result),void 0===u)throw new v("internal","Response is missing data field.");return [2,{data:this.serializer.decode(u)}]}})})},N);function N(e,t,n,r){var i=this;void 0===r&&(r="us-central1"),this.app_=e,this.region_=r,this.serializer=new w,this.emulatorOrigin=null,this.INTERNAL={delete:function(){return i.deleteService()}},this.contextProvider=new g(t,n),this.cancelAllRequests=new Promise(function(e){i.deleteService=function(){return e()};});}function I(e,t){var n=e.getProvider("app").getImmediate(),r=e.getProvider("auth-internal"),i=e.getProvider("messaging");return new O(n,r,i,t)}var T;T={Functions:O},A.INTERNAL.registerComponent(new a("functions",I,"PUBLIC").setServiceProps(T).setMultipleInstances(!0)),A.registerVersion("@firebase/functions","0.4.28");}).apply(this,arguments);}catch(e){throw console.error(e),new Error("Cannot instantiate firebase-functions - be sure to load firebase-app.js first.")}});

    });

    var firebaseStorage = createCommonjsModule(function (module, exports) {
    !function(e,t){t(index_cjs$2);}(commonjsGlobal,function(wt){try{(function(){wt=wt&&wt.hasOwnProperty("default")?wt.default:wt;var r=function(e,t){return (r=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(e,t){e.__proto__=t;}||function(e,t){for(var r in t)t.hasOwnProperty(r)&&(e[r]=t[r]);})(e,t)};function e(r,n){var o,i,a,e,s={label:0,sent:function(){if(1&a[0])throw a[1];return a[1]},trys:[],ops:[]};return e={next:t(0),throw:t(1),return:t(2)},"function"==typeof Symbol&&(e[Symbol.iterator]=function(){return this}),e;function t(t){return function(e){return function(t){if(o)throw new TypeError("Generator is already executing.");for(;s;)try{if(o=1,i&&(a=2&t[0]?i.return:t[0]?i.throw||((a=i.return)&&a.call(i),0):i.next)&&!(a=a.call(i,t[1])).done)return a;switch(i=0,a&&(t=[2&t[0],a.value]),t[0]){case 0:case 1:a=t;break;case 4:return s.label++,{value:t[1],done:!1};case 5:s.label++,i=t[1],t=[0];continue;case 7:t=s.ops.pop(),s.trys.pop();continue;default:if(!(a=0<(a=s.trys).length&&a[a.length-1])&&(6===t[0]||2===t[0])){s=0;continue}if(3===t[0]&&(!a||t[1]>a[0]&&t[1]<a[3])){s.label=t[1];break}if(6===t[0]&&s.label<a[1]){s.label=a[1],a=t;break}if(a&&s.label<a[2]){s.label=a[2],s.ops.push(t);break}a[2]&&s.ops.pop(),s.trys.pop();continue}t=n.call(r,s);}catch(e){t=[6,e],i=0;}finally{o=a=0;}if(5&t[0])throw t[1];return {value:t[0]?t[1]:void 0,done:!0}}([t,e])}}}function d(){for(var e=0,t=0,r=arguments.length;t<r;t++)e+=arguments[t].length;var n=Array(e),o=0;for(t=0;t<r;t++)for(var i=arguments[t],a=0,s=i.length;a<s;a++,o++)n[o]=i[a];return n}var t,n,o,h=(o=Error,r(t=a,n=o),void(t.prototype=null===n?Object.create(n):(i.prototype=n.prototype,new i)),a);function i(){this.constructor=t;}function a(e,t){var r=o.call(this,t)||this;return r.code=e,r.name="FirebaseError",Object.setPrototypeOf(r,a.prototype),Error.captureStackTrace&&Error.captureStackTrace(r,s.prototype.create),r}var s=(u.prototype.create=function(e){for(var t=[],r=1;r<arguments.length;r++)t[r-1]=arguments[r];for(var n=t[0]||{},o=this.service+"/"+e,i=this.errors[e],a=i?function(e,n){return e.replace(f,function(e,t){var r=n[t];return null!=r?r.toString():"<"+t+"?>"})}(i,n):"Error",s=this.serviceName+": "+a+" ("+o+").",u=new h(o,s),c=0,l=Object.keys(n);c<l.length;c++){var p=l[c];"_"!==p.slice(-1)&&(p in u&&console.warn('Overwriting FirebaseError base field "'+p+'" can cause unexpected behavior.'),u[p]=n[p]);}return u},u);function u(e,t,r){this.service=e,this.serviceName=t,this.errors=r;}var f=/\{\$([^}]+)}/g,c=(l.prototype.setInstantiationMode=function(e){return this.instantiationMode=e,this},l.prototype.setMultipleInstances=function(e){return this.multipleInstances=e,this},l.prototype.setServiceProps=function(e){return this.serviceProps=e,this},l);function l(e,t,r){this.name=e,this.instanceFactory=t,this.type=r,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY";}var p="firebasestorage.googleapis.com",_="storageBucket",m=(v.prototype.codeProp=function(){return this.code},v.prototype.codeEquals=function(e){return g(e)===this.codeProp()},v.prototype.serverResponseProp=function(){return this.serverResponse_},v.prototype.setServerResponseProp=function(e){this.serverResponse_=e;},Object.defineProperty(v.prototype,"name",{get:function(){return this.name_},enumerable:!0,configurable:!0}),Object.defineProperty(v.prototype,"code",{get:function(){return this.code_},enumerable:!0,configurable:!0}),Object.defineProperty(v.prototype,"message",{get:function(){return this.message_},enumerable:!0,configurable:!0}),Object.defineProperty(v.prototype,"serverResponse",{get:function(){return this.serverResponse_},enumerable:!0,configurable:!0}),v);function v(e,t){this.code_=g(e),this.message_="Firebase Storage: "+t,this.serverResponse_=null,this.name_="FirebaseError";}var b={UNKNOWN:"unknown",OBJECT_NOT_FOUND:"object-not-found",BUCKET_NOT_FOUND:"bucket-not-found",PROJECT_NOT_FOUND:"project-not-found",QUOTA_EXCEEDED:"quota-exceeded",UNAUTHENTICATED:"unauthenticated",UNAUTHORIZED:"unauthorized",RETRY_LIMIT_EXCEEDED:"retry-limit-exceeded",INVALID_CHECKSUM:"invalid-checksum",CANCELED:"canceled",INVALID_EVENT_NAME:"invalid-event-name",INVALID_URL:"invalid-url",INVALID_DEFAULT_BUCKET:"invalid-default-bucket",NO_DEFAULT_BUCKET:"no-default-bucket",CANNOT_SLICE_BLOB:"cannot-slice-blob",SERVER_FILE_WRONG_SIZE:"server-file-wrong-size",NO_DOWNLOAD_URL:"no-download-url",INVALID_ARGUMENT:"invalid-argument",INVALID_ARGUMENT_COUNT:"invalid-argument-count",APP_DELETED:"app-deleted",INVALID_ROOT_OPERATION:"invalid-root-operation",INVALID_FORMAT:"invalid-format",INTERNAL_ERROR:"internal-error"};function g(e){return "storage/"+e}function y(){return new m(b.UNKNOWN,"An unknown error occurred, please check the error payload for server response.")}function w(){return new m(b.CANCELED,"User canceled the upload/download.")}function R(){return new m(b.CANNOT_SLICE_BLOB,"Cannot slice blob for upload. Please retry the upload.")}function T(e,t,r){return new m(b.INVALID_ARGUMENT,"Invalid argument in `"+t+"` at index "+e+": "+r)}function E(){return new m(b.APP_DELETED,"The Firebase app was deleted.")}function k(e,t){return new m(b.INVALID_FORMAT,"String does not match format '"+e+"': "+t)}function O(e){throw new m(b.INTERNAL_ERROR,"Internal error: "+e)}var U={RAW:"raw",BASE64:"base64",BASE64URL:"base64url",DATA_URL:"data_url"};function A(e){switch(e){case U.RAW:case U.BASE64:case U.BASE64URL:case U.DATA_URL:return;default:throw "Expected one of the event types: ["+U.RAW+", "+U.BASE64+", "+U.BASE64URL+", "+U.DATA_URL+"]."}}var x=function(e,t){this.data=e,this.contentType=t||null;};function P(e,t){switch(e){case U.RAW:return new x(S(t));case U.BASE64:case U.BASE64URL:return new x(C(e,t));case U.DATA_URL:return new x(function(e){var t=new N(e);return t.base64?C(U.BASE64,t.rest):function(e){var t;try{t=decodeURIComponent(e);}catch(e){throw k(U.DATA_URL,"Malformed data URL.")}return S(t)}(t.rest)}(t),function(e){return new N(e).contentType}(t))}throw y()}function S(e){for(var t=[],r=0;r<e.length;r++){var n=e.charCodeAt(r);if(n<=127)t.push(n);else if(n<=2047)t.push(192|n>>6,128|63&n);else if(55296==(64512&n))if(r<e.length-1&&56320==(64512&e.charCodeAt(r+1)))n=65536|(1023&n)<<10|1023&e.charCodeAt(++r),t.push(240|n>>18,128|n>>12&63,128|n>>6&63,128|63&n);else t.push(239,191,189);else 56320==(64512&n)?t.push(239,191,189):t.push(224|n>>12,128|n>>6&63,128|63&n);}return new Uint8Array(t)}function C(t,e){switch(t){case U.BASE64:var r=-1!==e.indexOf("-"),n=-1!==e.indexOf("_");if(r||n)throw k(t,"Invalid character '"+(r?"-":"_")+"' found: is it base64url encoded?");break;case U.BASE64URL:var o=-1!==e.indexOf("+"),i=-1!==e.indexOf("/");if(o||i)throw k(t,"Invalid character '"+(o?"+":"/")+"' found: is it base64 encoded?");e=e.replace(/-/g,"+").replace(/_/g,"/");}var a;try{a=atob(e);}catch(e){throw k(t,"Invalid character found")}for(var s=new Uint8Array(a.length),u=0;u<a.length;u++)s[u]=a.charCodeAt(u);return s}var N=function(e){this.base64=!1,this.contentType=null;var t=e.match(/^data:([^,]+)?,/);if(null===t)throw k(U.DATA_URL,"Must be formatted 'data:[<mediatype>][;base64],<data>");var r=t[1]||null;null!=r&&(this.base64=function(e,t){return e.length>=t.length&&e.substring(e.length-t.length)===t}(r,";base64"),this.contentType=this.base64?r.substring(0,r.length-";base64".length):r),this.rest=e.substring(e.indexOf(",")+1);};var I,L,D={STATE_CHANGED:"state_changed"},M="running",W="pausing",B="paused",j="success",q="canceling",F="canceled",H="error",z={RUNNING:"running",PAUSED:"paused",SUCCESS:"success",CANCELED:"canceled",ERROR:"error"};function G(e){switch(e){case M:case W:case q:return z.RUNNING;case B:return z.PAUSED;case j:return z.SUCCESS;case F:return z.CANCELED;case H:default:return z.ERROR}}function X(e){return null!=e}function V(e){return void 0!==e}function K(e){return "function"==typeof e}function Z(e){return "object"==typeof e}function J(e){return "string"==typeof e||e instanceof String}function $(e){return "number"==typeof e||e instanceof Number}function Q(e){return Y()&&e instanceof Blob}function Y(){return "undefined"!=typeof Blob}(L=I=I||{})[L.NO_ERROR=0]="NO_ERROR",L[L.NETWORK_ERROR=1]="NETWORK_ERROR",L[L.ABORT=2]="ABORT";var ee=(te.prototype.send=function(e,t,r,n){if(this.sent_)throw O("cannot .send() more than once");if(this.sent_=!0,this.xhr_.open(t,e,!0),X(n))for(var o in n)n.hasOwnProperty(o)&&this.xhr_.setRequestHeader(o,n[o].toString());return X(r)?this.xhr_.send(r):this.xhr_.send(),this.sendPromise_},te.prototype.getErrorCode=function(){if(!this.sent_)throw O("cannot .getErrorCode() before sending");return this.errorCode_},te.prototype.getStatus=function(){if(!this.sent_)throw O("cannot .getStatus() before sending");try{return this.xhr_.status}catch(e){return -1}},te.prototype.getResponseText=function(){if(!this.sent_)throw O("cannot .getResponseText() before sending");return this.xhr_.responseText},te.prototype.abort=function(){this.xhr_.abort();},te.prototype.getResponseHeader=function(e){return this.xhr_.getResponseHeader(e)},te.prototype.addUploadProgressListener=function(e){X(this.xhr_.upload)&&this.xhr_.upload.addEventListener("progress",e);},te.prototype.removeUploadProgressListener=function(e){X(this.xhr_.upload)&&this.xhr_.upload.removeEventListener("progress",e);},te);function te(){var t=this;this.sent_=!1,this.xhr_=new XMLHttpRequest,this.errorCode_=I.NO_ERROR,this.sendPromise_=new Promise(function(e){t.xhr_.addEventListener("abort",function(){t.errorCode_=I.ABORT,e(t);}),t.xhr_.addEventListener("error",function(){t.errorCode_=I.NETWORK_ERROR,e(t);}),t.xhr_.addEventListener("load",function(){e(t);});});}var re=(ne.prototype.createXhrIo=function(){return new ee},ne);function ne(){}function oe(){for(var e=[],t=0;t<arguments.length;t++)e[t]=arguments[t];var r="undefined"!=typeof BlobBuilder?BlobBuilder:"undefined"!=typeof WebKitBlobBuilder?WebKitBlobBuilder:void 0;if(void 0!==r){for(var n=new r,o=0;o<e.length;o++)n.append(e[o]);return n.getBlob()}if(Y())return new Blob(e);throw Error("This browser doesn't seem to support creating Blobs")}var ie=(ae.prototype.size=function(){return this.size_},ae.prototype.type=function(){return this.type_},ae.prototype.slice=function(e,t){if(Q(this.data_)){var r=function(e,t,r){return e.webkitSlice?e.webkitSlice(t,r):e.mozSlice?e.mozSlice(t,r):e.slice?e.slice(t,r):null}(this.data_,e,t);return null===r?null:new ae(r)}return new ae(new Uint8Array(this.data_.buffer,e,t-e),!0)},ae.getBlob=function(){for(var e=[],t=0;t<arguments.length;t++)e[t]=arguments[t];if(Y()){var r=e.map(function(e){return e instanceof ae?e.data_:e});return new ae(oe.apply(null,r))}var n=e.map(function(e){return J(e)?P(U.RAW,e).data:e.data_}),o=0;n.forEach(function(e){o+=e.byteLength;});var i=new Uint8Array(o),a=0;return n.forEach(function(e){for(var t=0;t<e.length;t++)i[a++]=e[t];}),new ae(i,!0)},ae.prototype.uploadData=function(){return this.data_},ae);function ae(e,t){var r=0,n="";Q(e)?(r=(this.data_=e).size,n=e.type):e instanceof ArrayBuffer?(t?this.data_=new Uint8Array(e):(this.data_=new Uint8Array(e.byteLength),this.data_.set(new Uint8Array(e))),r=this.data_.length):e instanceof Uint8Array&&(t?this.data_=e:(this.data_=new Uint8Array(e.length),this.data_.set(e)),r=e.length),this.size_=r,this.type_=n;}var se=(Object.defineProperty(ue.prototype,"path",{get:function(){return this.path_},enumerable:!0,configurable:!0}),Object.defineProperty(ue.prototype,"isRoot",{get:function(){return 0===this.path.length},enumerable:!0,configurable:!0}),ue.prototype.fullServerUrl=function(){var e=encodeURIComponent;return "/b/"+e(this.bucket)+"/o/"+e(this.path)},ue.prototype.bucketOnlyServerUrl=function(){return "/b/"+encodeURIComponent(this.bucket)+"/o"},ue.makeFromBucketSpec=function(t){var e;try{e=ue.makeFromUrl(t);}catch(e){return new ue(t,"")}if(""===e.path)return e;throw function(e){return new m(b.INVALID_DEFAULT_BUCKET,"Invalid default bucket '"+e+"'.")}(t)},ue.makeFromUrl=function(e){for(var t=null,r="([A-Za-z0-9.\\-_]+)",n=new RegExp("^gs://"+r+"(/(.*))?$","i"),o=p.replace(/[.]/g,"\\."),i=[{regex:n,indices:{bucket:1,path:3},postModify:function(e){"/"===e.path.charAt(e.path.length-1)&&(e.path_=e.path_.slice(0,-1));}},{regex:new RegExp("^https?://"+o+"/v[A-Za-z0-9_]+/b/"+r+"/o(/([^?#]*).*)?$","i"),indices:{bucket:1,path:3},postModify:function(e){e.path_=decodeURIComponent(e.path);}}],a=0;a<i.length;a++){var s=i[a],u=s.regex.exec(e);if(u){var c=u[s.indices.bucket],l=u[s.indices.path];t=new ue(c,l=l||""),s.postModify(t);break}}if(null==t)throw function(e){return new m(b.INVALID_URL,"Invalid URL '"+e+"'.")}(e);return t},ue);function ue(e,t){this.bucket=e,this.path_=t;}function ce(e){var t;try{t=JSON.parse(e);}catch(e){return null}return function(e){return Z(e)&&!Array.isArray(e)}(t)?t:null}function le(e){var t=e.lastIndexOf("/",e.length-2);return -1===t?e:e.slice(t+1)}function pe(e){return "https://"+p+"/v0"+e}function he(e){var t=encodeURIComponent,r="?";for(var n in e){if(e.hasOwnProperty(n))r=r+(t(n)+"="+t(e[n]))+"&";}return r=r.slice(0,-1)}function fe(e,t){return t}var de=function(e,t,r,n){this.server=e,this.local=t||e,this.writable=!!r,this.xform=n||fe;},_e=null;function ve(){if(_e)return _e;var e=[];e.push(new de("bucket")),e.push(new de("generation")),e.push(new de("metageneration")),e.push(new de("name","fullPath",!0));var t=new de("name");t.xform=function(e,t){return function(e){return !J(e)||e.length<2?e:le(e)}(t)},e.push(t);var r=new de("size");return r.xform=function(e,t){return X(t)?Number(t):t},e.push(r),e.push(new de("timeCreated")),e.push(new de("updated")),e.push(new de("md5Hash",null,!0)),e.push(new de("cacheControl",null,!0)),e.push(new de("contentDisposition",null,!0)),e.push(new de("contentEncoding",null,!0)),e.push(new de("contentLanguage",null,!0)),e.push(new de("contentType",null,!0)),e.push(new de("metadata","customMetadata",!0)),_e=e}function me(n,o){Object.defineProperty(n,"ref",{get:function(){var e=n.bucket,t=n.fullPath,r=new se(e,t);return o.makeStorageReference(r)}});}function be(e,t,r){var n=ce(t);return null===n?null:function(e,t,r){for(var n={type:"file"},o=r.length,i=0;i<o;i++){var a=r[i];n[a.local]=a.xform(n,t[a.server]);}return me(n,e),n}(e,n,r)}function ge(e,t){for(var r={},n=t.length,o=0;o<n;o++){var i=t[o];i.writable&&(r[i.server]=e[i.local]);}return JSON.stringify(r)}function ye(e){if(!Z(e)||!e)throw "Expected Metadata object.";for(var t in e)if(e.hasOwnProperty(t)){var r=e[t];if("customMetadata"===t){if(!Z(r))throw "Expected object for 'customMetadata' mapping."}else if(Z(n=r)&&null!==n)throw "Mapping for '"+t+"' cannot be an object."}var n;}var we="maxResults",Re=1e3,Te="pageToken",Ee="prefixes",ke="items";function Oe(e,t){var r={prefixes:[],items:[],nextPageToken:t.nextPageToken},n=e.bucket();if(null===n)throw new m(b.NO_DEFAULT_BUCKET,"No default bucket found. Did you set the '"+_+"' property when initializing the app?");if(t[Ee])for(var o=0,i=t[Ee];o<i.length;o++){var a=i[o].replace(/\/$/,""),s=e.makeStorageReference(new se(n,a));r.prefixes.push(s);}if(t[ke])for(var u=0,c=t[ke];u<c.length;u++){var l=c[u];s=e.makeStorageReference(new se(n,l.name));r.items.push(s);}return r}function Ue(e){if(!Z(e)||!e)throw "Expected ListOptions object.";for(var t in e)if(t===we){if(!$(r=e[we])||!Number.isInteger(r)||e[we]<=0)throw "Expected maxResults to be a positive number.";if(1e3<e[we])throw "Expected maxResults to be less than or equal to "+Re+"."}else{if(t!==Te)throw "Unknown option: "+t;if(e[Te]&&!J(e[Te]))throw "Expected pageToken to be string."}var r;}var Ae=function(e,t,r,n){this.url=e,this.method=t,this.handler=r,this.timeout=n,this.urlParams={},this.headers={},this.body=null,this.errorHandler=null,this.progressCallback=null,this.successCodes=[200],this.additionalRetryCodes=[];};function xe(e){if(!e)throw y()}function Pe(n,o){return function(e,t){var r=be(n,t,o);return xe(null!==r),r}}function Se(n){return function(e,t){var r=function(e,t){var r=ce(t);return null===r?null:Oe(e,r)}(n,t);return xe(null!==r),r}}function Ce(n,o){return function(e,t){var r=be(n,t,o);return xe(null!==r),function(n,e){var t=ce(e);if(null===t)return null;if(!J(t.downloadTokens))return null;var r=t.downloadTokens;if(0===r.length)return null;var o=encodeURIComponent;return r.split(",").map(function(e){var t=n.bucket,r=n.fullPath;return pe("/b/"+o(t)+"/o/"+o(r))+he({alt:"media",token:e})})[0]}(r,t)}}function Ne(n){return function(e,t){var r;return (r=401===e.getStatus()?new m(b.UNAUTHENTICATED,"User is not authenticated, please authenticate using Firebase Authentication and try again."):402===e.getStatus()?function(e){return new m(b.QUOTA_EXCEEDED,"Quota for bucket '"+e+"' exceeded, please view quota on https://firebase.google.com/pricing/.")}(n.bucket):403===e.getStatus()?function(e){return new m(b.UNAUTHORIZED,"User does not have permission to access '"+e+"'.")}(n.path):t).setServerResponseProp(t.serverResponseProp()),r}}function Ie(n){var o=Ne(n);return function(e,t){var r=o(e,t);return 404===e.getStatus()&&(r=function(e){return new m(b.OBJECT_NOT_FOUND,"Object '"+e+"' does not exist.")}(n.path)),r.setServerResponseProp(t.serverResponseProp()),r}}function Le(e,t,r){var n=pe(t.fullServerUrl()),o=e.maxOperationRetryTime(),i=new Ae(n,"GET",Pe(e,r),o);return i.errorHandler=Ie(t),i}function De(e,t,r){var n=Object.assign({},r);return n.fullPath=e.path,n.size=t.size(),n.contentType||(n.contentType=function(e,t){return e&&e.contentType||t&&t.type()||"application/octet-stream"}(null,t)),n}function Me(e,t,r,n,o){var i=t.bucketOnlyServerUrl(),a={"X-Goog-Upload-Protocol":"multipart"};var s=function(){for(var e="",t=0;t<2;t++)e+=Math.random().toString().slice(2);return e}();a["Content-Type"]="multipart/related; boundary="+s;var u=De(t,n,o),c="--"+s+"\r\nContent-Type: application/json; charset=utf-8\r\n\r\n"+ge(u,r)+"\r\n--"+s+"\r\nContent-Type: "+u.contentType+"\r\n\r\n",l="\r\n--"+s+"--",p=ie.getBlob(c,n,l);if(null===p)throw R();var h={name:u.fullPath},f=pe(i),d=e.maxUploadRetryTime(),_=new Ae(f,"POST",Pe(e,r),d);return _.urlParams=h,_.headers=a,_.body=p.uploadData(),_.errorHandler=Ne(t),_}var We=function(e,t,r,n){this.current=e,this.total=t,this.finalized=!!r,this.metadata=n||null;};function Be(e,t){var r=null;try{r=e.getResponseHeader("X-Goog-Upload-Status");}catch(e){xe(!1);}return xe(!!r&&-1!==(t||["active"]).indexOf(r)),r}function je(e,t,r,n,o){var i=t.bucketOnlyServerUrl(),a=De(t,n,o),s={name:a.fullPath},u=pe(i),c={"X-Goog-Upload-Protocol":"resumable","X-Goog-Upload-Command":"start","X-Goog-Upload-Header-Content-Length":n.size(),"X-Goog-Upload-Header-Content-Type":a.contentType,"Content-Type":"application/json; charset=utf-8"},l=ge(a,r),p=e.maxUploadRetryTime();var h=new Ae(u,"POST",function(e){var t;Be(e);try{t=e.getResponseHeader("X-Goog-Upload-URL");}catch(e){xe(!1);}return xe(J(t)),t},p);return h.urlParams=s,h.headers=c,h.body=l,h.errorHandler=Ne(t),h}function qe(e,t,r,o){var n=e.maxUploadRetryTime(),i=new Ae(r,"POST",function(e){var t=Be(e,["active","final"]),r=null;try{r=e.getResponseHeader("X-Goog-Upload-Size-Received");}catch(e){xe(!1);}r||xe(!1);var n=Number(r);return xe(!isNaN(n)),new We(n,o.size(),"final"===t)},n);return i.headers={"X-Goog-Upload-Command":"query"},i.errorHandler=Ne(t),i}function Fe(e,a,t,s,r,u,n,o){var c=new We(0,0);if(n?(c.current=n.current,c.total=n.total):(c.current=0,c.total=s.size()),s.size()!==c.total)throw new m(b.SERVER_FILE_WRONG_SIZE,"Server recorded incorrect upload file size, please retry the upload.");var i=c.total-c.current,l=i;0<r&&(l=Math.min(l,r));var p=c.current,h=p+l,f={"X-Goog-Upload-Command":l===i?"upload, finalize":"upload","X-Goog-Upload-Offset":c.current},d=s.slice(p,h);if(null===d)throw R();var _=a.maxUploadRetryTime(),v=new Ae(t,"POST",function(e,t){var r,n=Be(e,["active","final"]),o=c.current+l,i=s.size();return r="final"===n?Pe(a,u)(e,t):null,new We(o,i,"final"===n,r)},_);return v.headers=f,v.body=d.uploadData(),v.progressCallback=o||null,v.errorHandler=Ne(e),v}var He=function(e,t,r){if(K(e)||X(t)||X(r))this.next=e,this.error=t||null,this.complete=r||null;else{var n=e;this.next=n.next||null,this.error=n.error||null,this.complete=n.complete||null;}},ze=function(e,t,r,n,o,i){this.bytesTransferred=e,this.totalBytes=t,this.state=r,this.metadata=n,this.task=o,this.ref=i;};function Ge(t,e,r){for(var n=e.length,o=e.length,i=0;i<e.length;i++)if(e[i].optional){n=i;break}if(!(n<=r.length&&r.length<=o))throw function(e,t,r,n){var o,i;return i=e===t?1===(o=e)?"argument":"arguments":(o="between "+e+" and "+t,"arguments"),new m(b.INVALID_ARGUMENT_COUNT,"Invalid argument count in `"+r+"`: Expected "+o+" "+i+", received "+n+".")}(n,o,t,r.length);for(i=0;i<r.length;i++)try{e[i].validator(r[i]);}catch(e){throw e instanceof Error?T(i,t,e.message):T(i,t,e)}}var Xe=function(t,e){var r=this;this.validator=function(e){r.optional&&!V(e)||t(e);},this.optional=!!e;};function Ve(e,t){function r(e){if(!J(e))throw "Expected string."}var n;return n=e?function(t,r){return function(e){t(e),r(e);}}(r,e):r,new Xe(n,t)}function Ke(){return new Xe(function(e){if(!(e instanceof Uint8Array||e instanceof ArrayBuffer||Y()&&e instanceof Blob))throw "Expected Blob or File."})}function Ze(e){return new Xe(ye,e)}function Je(){return new Xe(function(e){if(!($(e)&&0<=e))throw "Expected a number 0 or greater."})}function $e(t,e){return new Xe(function(e){if(!(null===e||X(e)&&e instanceof Object))throw "Expected an Object.";null!=t&&t(e);},e)}function Qe(e){return new Xe(function(e){if(!(null===e||K(e)))throw "Expected a Function."},e)}function Ye(r){return function(){for(var e=[],t=0;t<arguments.length;t++)e[t]=arguments[t];Promise.resolve().then(function(){return r.apply(void 0,e)});}}var et=(tt.prototype.makeProgressCallback_=function(){var t=this,r=this.transferred_;return function(e){return t.updateProgress_(r+e)}},tt.prototype.shouldDoResumable_=function(e){return 262144<e.size()},tt.prototype.start_=function(){this.state_===M&&null===this.request_&&(this.resumable_?null===this.uploadUrl_?this.createResumable_():this.needToFetchStatus_?this.fetchStatus_():this.needToFetchMetadata_?this.fetchMetadata_():this.continueUpload_():this.oneShotUpload_());},tt.prototype.resolveToken_=function(t){var r=this;this.authWrapper_.getAuthToken().then(function(e){switch(r.state_){case M:t(e);break;case q:r.transition_(F);break;case W:r.transition_(B);}});},tt.prototype.createResumable_=function(){var n=this;this.resolveToken_(function(e){var t=je(n.authWrapper_,n.location_,n.mappings_,n.blob_,n.metadata_),r=n.authWrapper_.makeRequest(t,e);(n.request_=r).getPromise().then(function(e){n.request_=null,n.uploadUrl_=e,n.needToFetchStatus_=!1,n.completeTransitions_();},n.errorHandler_);});},tt.prototype.fetchStatus_=function(){var n=this,o=this.uploadUrl_;this.resolveToken_(function(e){var t=qe(n.authWrapper_,n.location_,o,n.blob_),r=n.authWrapper_.makeRequest(t,e);(n.request_=r).getPromise().then(function(e){e=e,n.request_=null,n.updateProgress_(e.current),n.needToFetchStatus_=!1,e.finalized&&(n.needToFetchMetadata_=!0),n.completeTransitions_();},n.errorHandler_);});},tt.prototype.continueUpload_=function(){var n=this,o=262144*this.chunkMultiplier_,i=new We(this.transferred_,this.blob_.size()),a=this.uploadUrl_;this.resolveToken_(function(e){var t;try{t=Fe(n.location_,n.authWrapper_,a,n.blob_,o,n.mappings_,i,n.makeProgressCallback_());}catch(e){return n.error_=e,void n.transition_(H)}var r=n.authWrapper_.makeRequest(t,e);(n.request_=r).getPromise().then(function(e){n.increaseMultiplier_(),n.request_=null,n.updateProgress_(e.current),e.finalized?(n.metadata_=e.metadata,n.transition_(j)):n.completeTransitions_();},n.errorHandler_);});},tt.prototype.increaseMultiplier_=function(){262144*this.chunkMultiplier_<33554432&&(this.chunkMultiplier_*=2);},tt.prototype.fetchMetadata_=function(){var n=this;this.resolveToken_(function(e){var t=Le(n.authWrapper_,n.location_,n.mappings_),r=n.authWrapper_.makeRequest(t,e);(n.request_=r).getPromise().then(function(e){n.request_=null,n.metadata_=e,n.transition_(j);},n.metadataErrorHandler_);});},tt.prototype.oneShotUpload_=function(){var n=this;this.resolveToken_(function(e){var t=Me(n.authWrapper_,n.location_,n.mappings_,n.blob_,n.metadata_),r=n.authWrapper_.makeRequest(t,e);(n.request_=r).getPromise().then(function(e){n.request_=null,n.metadata_=e,n.updateProgress_(n.blob_.size()),n.transition_(j);},n.errorHandler_);});},tt.prototype.updateProgress_=function(e){var t=this.transferred_;this.transferred_=e,this.transferred_!==t&&this.notifyObservers_();},tt.prototype.transition_=function(e){if(this.state_!==e)switch(e){case q:case W:this.state_=e,null!==this.request_&&this.request_.cancel();break;case M:var t=this.state_===B;this.state_=e,t&&(this.notifyObservers_(),this.start_());break;case B:this.state_=e,this.notifyObservers_();break;case F:this.error_=w(),this.state_=e,this.notifyObservers_();break;case H:case j:this.state_=e,this.notifyObservers_();}},tt.prototype.completeTransitions_=function(){switch(this.state_){case W:this.transition_(B);break;case q:this.transition_(F);break;case M:this.start_();}},Object.defineProperty(tt.prototype,"snapshot",{get:function(){var e=G(this.state_);return new ze(this.transferred_,this.blob_.size(),e,this.metadata_,this,this.ref_)},enumerable:!0,configurable:!0}),tt.prototype.on=function(e,t,r,i){var n="Expected a function or an Object with one of `next`, `error`, `complete` properties.",o=Qe(!0).validator,a=$e(null,!0).validator;function s(e){try{return void o(e)}catch(e){}try{if(a(e),!(V(e.next)||V(e.error)||V(e.complete)))throw "";return}catch(e){throw n}}Ge("on",[Ve(function(){if(e!==D.STATE_CHANGED)throw "Expected one of the event types: ["+D.STATE_CHANGED+"]."}),$e(s,!0),Qe(!0),Qe(!0)],arguments);var u=this;function c(o){return function(e,t,r){null!==o&&Ge("on",o,arguments);var n=new He(e,t,i);return u.addObserver_(n),function(){u.removeObserver_(n);}}}var l=[$e(function(e){if(null===e)throw n;s(e);}),Qe(!0),Qe(!0)];return V(t)||V(r)||V(i)?c(null)(t,r,i):c(l)},tt.prototype.then=function(e,t){return this.promise_.then(e,t)},tt.prototype.catch=function(e){return this.then(null,e)},tt.prototype.addObserver_=function(e){this.observers_.push(e),this.notifyObserver_(e);},tt.prototype.removeObserver_=function(e){var t=this.observers_.indexOf(e);-1!==t&&this.observers_.splice(t,1);},tt.prototype.notifyObservers_=function(){var t=this;this.finishPromise_(),this.observers_.slice().forEach(function(e){t.notifyObserver_(e);});},tt.prototype.finishPromise_=function(){if(null!==this.resolve_){var e=!0;switch(G(this.state_)){case z.SUCCESS:Ye(this.resolve_.bind(null,this.snapshot))();break;case z.CANCELED:case z.ERROR:Ye(this.reject_.bind(null,this.error_))();break;default:e=!1;}e&&(this.resolve_=null,this.reject_=null);}},tt.prototype.notifyObserver_=function(e){switch(G(this.state_)){case z.RUNNING:case z.PAUSED:e.next&&Ye(e.next.bind(e,this.snapshot))();break;case z.SUCCESS:e.complete&&Ye(e.complete.bind(e))();break;case z.CANCELED:case z.ERROR:e.error&&Ye(e.error.bind(e,this.error_))();break;default:e.error&&Ye(e.error.bind(e,this.error_))();}},tt.prototype.resume=function(){Ge("resume",[],arguments);var e=this.state_===B||this.state_===W;return e&&this.transition_(M),e},tt.prototype.pause=function(){Ge("pause",[],arguments);var e=this.state_===M;return e&&this.transition_(W),e},tt.prototype.cancel=function(){Ge("cancel",[],arguments);var e=this.state_===M||this.state_===W;return e&&this.transition_(q),e},tt);function tt(e,t,r,n,o,i){var a=this;void 0===i&&(i=null),this.transferred_=0,this.needToFetchStatus_=!1,this.needToFetchMetadata_=!1,this.observers_=[],this.error_=null,this.uploadUrl_=null,this.request_=null,this.chunkMultiplier_=1,this.resolve_=null,this.reject_=null,this.ref_=e,this.authWrapper_=t,this.location_=r,this.blob_=o,this.metadata_=i,this.mappings_=n,this.resumable_=this.shouldDoResumable_(this.blob_),this.state_=M,this.errorHandler_=function(e){a.request_=null,a.chunkMultiplier_=1,e.codeEquals(b.CANCELED)?(a.needToFetchStatus_=!0,a.completeTransitions_()):(a.error_=e,a.transition_(H));},this.metadataErrorHandler_=function(e){a.request_=null,e.codeEquals(b.CANCELED)?a.completeTransitions_():(a.error_=e,a.transition_(H));},this.promise_=new Promise(function(e,t){a.resolve_=e,a.reject_=t,a.start_();}),this.promise_.then(null,function(){});}var rt=(nt.prototype.toString=function(){return Ge("toString",[],arguments),"gs://"+this.location.bucket+"/"+this.location.path},nt.prototype.newRef=function(e,t){return new nt(e,t)},nt.prototype.mappings=function(){return ve()},nt.prototype.child=function(e){Ge("child",[Ve()],arguments);var t=function(e,t){var r=t.split("/").filter(function(e){return 0<e.length}).join("/");return 0===e.length?r:e+"/"+r}(this.location.path,e),r=new se(this.location.bucket,t);return this.newRef(this.authWrapper,r)},Object.defineProperty(nt.prototype,"parent",{get:function(){var e=function(e){if(0===e.length)return null;var t=e.lastIndexOf("/");return -1===t?"":e.slice(0,t)}(this.location.path);if(null===e)return null;var t=new se(this.location.bucket,e);return this.newRef(this.authWrapper,t)},enumerable:!0,configurable:!0}),Object.defineProperty(nt.prototype,"root",{get:function(){var e=new se(this.location.bucket,"");return this.newRef(this.authWrapper,e)},enumerable:!0,configurable:!0}),Object.defineProperty(nt.prototype,"bucket",{get:function(){return this.location.bucket},enumerable:!0,configurable:!0}),Object.defineProperty(nt.prototype,"fullPath",{get:function(){return this.location.path},enumerable:!0,configurable:!0}),Object.defineProperty(nt.prototype,"name",{get:function(){return le(this.location.path)},enumerable:!0,configurable:!0}),Object.defineProperty(nt.prototype,"storage",{get:function(){return this.authWrapper.service()},enumerable:!0,configurable:!0}),nt.prototype.put=function(e,t){return void 0===t&&(t=null),Ge("put",[Ke(),Ze(!0)],arguments),this.throwIfRoot_("put"),new et(this,this.authWrapper,this.location,this.mappings(),new ie(e),t)},nt.prototype.putString=function(e,t,r){void 0===t&&(t=U.RAW),Ge("putString",[Ve(),Ve(A,!0),Ze(!0)],arguments),this.throwIfRoot_("putString");var n=P(t,e),o=Object.assign({},r);return !X(o.contentType)&&X(n.contentType)&&(o.contentType=n.contentType),new et(this,this.authWrapper,this.location,this.mappings(),new ie(n.data,!0),o)},nt.prototype.delete=function(){var r=this;return Ge("delete",[],arguments),this.throwIfRoot_("delete"),this.authWrapper.getAuthToken().then(function(e){var t=function(e,t){var r=pe(t.fullServerUrl()),n=e.maxOperationRetryTime(),o=new Ae(r,"DELETE",function(e,t){},n);return o.successCodes=[200,204],o.errorHandler=Ie(t),o}(r.authWrapper,r.location);return r.authWrapper.makeRequest(t,e).getPromise()})},nt.prototype.listAll=function(){Ge("listAll",[],arguments);var e={prefixes:[],items:[]};return this.listAllHelper(e).then(function(){return e})},nt.prototype.listAllHelper=function(i,a){return function(i,a,s,u){return new(s=s||Promise)(function(e,t){function r(e){try{o(u.next(e));}catch(e){t(e);}}function n(e){try{o(u.throw(e));}catch(e){t(e);}}function o(t){t.done?e(t.value):new s(function(e){e(t.value);}).then(r,n);}o((u=u.apply(i,a||[])).next());})}(this,void 0,void 0,function(){var t,r,n,o;return e(this,function(e){switch(e.label){case 0:return t={pageToken:a},[4,this.list(t)];case 1:return r=e.sent(),(n=i.prefixes).push.apply(n,r.prefixes),(o=i.items).push.apply(o,r.items),null==r.nextPageToken?[3,3]:[4,this.listAllHelper(i,r.nextPageToken)];case 2:e.sent(),e.label=3;case 3:return [2]}})})},nt.prototype.list=function(n){Ge("list",[function(e){return new Xe(Ue,e)}(!0)],arguments);var o=this;return this.authWrapper.getAuthToken().then(function(e){var t=n||{},r=function(e,t,r,n,o){var i={};t.isRoot?i.prefix="":i.prefix=t.path+"/",r&&0<r.length&&(i.delimiter=r),n&&(i.pageToken=n),o&&(i.maxResults=o);var a=pe(t.bucketOnlyServerUrl()),s=e.maxOperationRetryTime(),u=new Ae(a,"GET",Se(e),s);return u.urlParams=i,u.errorHandler=Ne(t),u}(o.authWrapper,o.location,"/",t.pageToken,t.maxResults);return o.authWrapper.makeRequest(r,e).getPromise()})},nt.prototype.getMetadata=function(){var r=this;return Ge("getMetadata",[],arguments),this.throwIfRoot_("getMetadata"),this.authWrapper.getAuthToken().then(function(e){var t=Le(r.authWrapper,r.location,r.mappings());return r.authWrapper.makeRequest(t,e).getPromise()})},nt.prototype.updateMetadata=function(r){var n=this;return Ge("updateMetadata",[Ze()],arguments),this.throwIfRoot_("updateMetadata"),this.authWrapper.getAuthToken().then(function(e){var t=function(e,t,r,n){var o=pe(t.fullServerUrl()),i=ge(r,n),a=e.maxOperationRetryTime(),s=new Ae(o,"PATCH",Pe(e,n),a);return s.headers={"Content-Type":"application/json; charset=utf-8"},s.body=i,s.errorHandler=Ie(t),s}(n.authWrapper,n.location,r,n.mappings());return n.authWrapper.makeRequest(t,e).getPromise()})},nt.prototype.getDownloadURL=function(){var r=this;return Ge("getDownloadURL",[],arguments),this.throwIfRoot_("getDownloadURL"),this.authWrapper.getAuthToken().then(function(e){var t=function(e,t,r){var n=pe(t.fullServerUrl()),o=e.maxOperationRetryTime(),i=new Ae(n,"GET",Ce(e,r),o);return i.errorHandler=Ie(t),i}(r.authWrapper,r.location,r.mappings());return r.authWrapper.makeRequest(t,e).getPromise().then(function(e){if(null===e)throw new m(b.NO_DOWNLOAD_URL,"The given file does not have any download URLs.");return e})})},nt.prototype.throwIfRoot_=function(e){if(""===this.location.path)throw function(e){return new m(b.INVALID_ROOT_OPERATION,"The operation '"+e+"' cannot be performed on a root reference, create a non-root reference using child, such as .child('file.png').")}(e)},nt);function nt(e,t){this.authWrapper=e,this.location=t instanceof se?t:se.makeFromUrl(t);}var ot=(it.prototype.getPromise=function(){return this.promise_},it.prototype.cancel=function(e){},it);function it(e){this.promise_=Promise.reject(e);}var at=(st.prototype.addRequest=function(e){var t=this,r=this.id;this.id++,this.map.set(r,e),e.getPromise().then(function(){return t.map.delete(r)},function(){return t.map.delete(r)});},st.prototype.clear=function(){this.map.forEach(function(e){e&&e.cancel(!0);}),this.map.clear();},st);function st(){this.map=new Map,this.id=-9007199254740991;}var ut=(ct.extractBucket_=function(e){var t=e[_]||null;return null==t?null:se.makeFromBucketSpec(t).bucket},ct.prototype.getAuthToken=function(){var e=this.authProvider_.getImmediate({optional:!0});return e?e.getToken().then(function(e){return null!==e?e.accessToken:null},function(){return null}):Promise.resolve(null)},ct.prototype.bucket=function(){if(this.deleted_)throw E();return this.bucket_},ct.prototype.service=function(){return this.service_},ct.prototype.makeStorageReference=function(e){return this.storageRefMaker_(this,e)},ct.prototype.makeRequest=function(e,t){if(this.deleted_)return new ot(E());var r=this.requestMaker_(e,t,this.pool_);return this.requestMap_.addRequest(r),r},ct.prototype.deleteApp=function(){this.deleted_=!0,this.app_=null,this.requestMap_.clear();},ct.prototype.maxUploadRetryTime=function(){return this.maxUploadRetryTime_},ct.prototype.setMaxUploadRetryTime=function(e){this.maxUploadRetryTime_=e;},ct.prototype.maxOperationRetryTime=function(){return this.maxOperationRetryTime_},ct.prototype.setMaxOperationRetryTime=function(e){this.maxOperationRetryTime_=e;},ct);function ct(e,t,r,n,o,i){if(this.bucket_=null,this.deleted_=!1,this.app_=e,null!==this.app_){var a=this.app_.options;X(a)&&(this.bucket_=ct.extractBucket_(a));}this.authProvider_=t,this.storageRefMaker_=r,this.requestMaker_=n,this.pool_=i,this.service_=o,this.maxOperationRetryTime_=12e4,this.maxUploadRetryTime_=6e5,this.requestMap_=new at;}var lt=(pt.prototype.start_=function(){var s=this;function e(e,t){var r,n=s.resolve_,o=s.reject_,i=t.xhr;if(t.wasSuccessCode)try{var a=s.callback_(i,i.getResponseText());V(a)?n(a):n();}catch(e){o(e);}else null!==i?((r=y()).setServerResponseProp(i.getResponseText()),s.errorCallback_?o(s.errorCallback_(i,r)):o(r)):t.canceled?o(r=s.appDelete_?E():w()):o(r=new m(b.RETRY_LIMIT_EXCEEDED,"Max retry time for operation exceeded, please try again."));}this.canceled_?e(0,new ht(!1,null,!0)):this.backoffId_=function(t,r,e){var n=1,o=null,i=!1,a=0;function s(){return 2===a}var u=!1;function c(){for(var e=[],t=0;t<arguments.length;t++)e[t]=arguments[t];u||(u=!0,r.apply(null,e));}function l(e){o=setTimeout(function(){o=null,t(p,s());},e);}function p(e){for(var t=[],r=1;r<arguments.length;r++)t[r-1]=arguments[r];u||(e?c.call.apply(c,d([null,e],t)):s()||i?c.call.apply(c,d([null,e],t)):(n<64&&(n*=2),l(1===a?(a=2,0):1e3*(n+Math.random()))));}var h=!1;function f(e){h||(h=!0,u||(null!==o?(e||(a=2),clearTimeout(o),l(0)):e||(a=1)));}return l(0),setTimeout(function(){f(i=!0);},e),f}(function(i,e){if(e)i(!1,new ht(!1,null,!0));else{var t=s.pool_.createXhrIo();s.pendingXhr_=t,null!==s.progressCallback_&&t.addUploadProgressListener(a),t.send(s.url_,s.method_,s.body_,s.headers_).then(function(e){null!==s.progressCallback_&&e.removeUploadProgressListener(a),s.pendingXhr_=null;var t=(e=e).getErrorCode()===I.NO_ERROR,r=e.getStatus();if(t&&!s.isRetryStatusCode_(r)){var n=-1!==s.successCodes_.indexOf(r);i(!0,new ht(n,e));}else{var o=e.getErrorCode()===I.ABORT;i(!1,new ht(!1,null,o));}});}function a(e){var t=e.loaded,r=e.lengthComputable?e.total:-1;null!==s.progressCallback_&&s.progressCallback_(t,r);}},e,this.timeout_);},pt.prototype.getPromise=function(){return this.promise_},pt.prototype.cancel=function(e){this.canceled_=!0,this.appDelete_=e||!1,null!==this.backoffId_&&function(e){e(!1);}(this.backoffId_),null!==this.pendingXhr_&&this.pendingXhr_.abort();},pt.prototype.isRetryStatusCode_=function(e){var t=500<=e&&e<600,r=-1!==[408,429].indexOf(e),n=-1!==this.additionalRetryCodes_.indexOf(e);return t||r||n},pt);function pt(e,t,r,n,o,i,a,s,u,c,l){var p=this;this.pendingXhr_=null,this.backoffId_=null,this.resolve_=null,this.reject_=null,this.canceled_=!1,this.appDelete_=!1,this.url_=e,this.method_=t,this.headers_=r,this.body_=n,this.successCodes_=o.slice(),this.additionalRetryCodes_=i.slice(),this.callback_=a,this.errorCallback_=s,this.progressCallback_=c,this.timeout_=u,this.pool_=l,this.promise_=new Promise(function(e,t){p.resolve_=e,p.reject_=t,p.start_();});}var ht=function(e,t,r){this.wasSuccessCode=e,this.xhr=t,this.canceled=!!r;};function ft(e,t,r){var n=he(e.urlParams),o=e.url+n,i=Object.assign({},e.headers);return function(e,t){null!==t&&0<t.length&&(e.Authorization="Firebase "+t);}(i,t),function(e){var t=void 0!==wt?wt.SDK_VERSION:"AppManager";e["X-Firebase-Storage-Version"]="webjs/"+t;}(i),new lt(o,e.method,i,e.body,e.successCodes,e.additionalRetryCodes,e.handler,e.errorHandler,e.timeout,e.progressCallback,r)}var dt=(_t.prototype.ref=function(e){if(Ge("ref",[Ve(function(e){if("string"!=typeof e)throw "Path is not a string.";if(/^[A-Za-z]+:\/\//.test(e))throw "Expected child path but got a URL, use refFromURL instead."},!0)],arguments),null==this.bucket_)throw new Error("No Storage Bucket defined in Firebase Options.");var t=new rt(this.authWrapper_,this.bucket_);return null!=e?t.child(e):t},_t.prototype.refFromURL=function(e){return Ge("refFromURL",[Ve(function(e){if("string"!=typeof e)throw "Path is not a string.";if(!/^[A-Za-z]+:\/\//.test(e))throw "Expected full URL but got a child path, use ref instead.";try{se.makeFromUrl(e);}catch(e){throw "Expected valid full URL but got an invalid one."}},!1)],arguments),new rt(this.authWrapper_,e)},Object.defineProperty(_t.prototype,"maxUploadRetryTime",{get:function(){return this.authWrapper_.maxUploadRetryTime()},enumerable:!0,configurable:!0}),_t.prototype.setMaxUploadRetryTime=function(e){Ge("setMaxUploadRetryTime",[Je()],arguments),this.authWrapper_.setMaxUploadRetryTime(e);},_t.prototype.setMaxOperationRetryTime=function(e){Ge("setMaxOperationRetryTime",[Je()],arguments),this.authWrapper_.setMaxOperationRetryTime(e);},Object.defineProperty(_t.prototype,"app",{get:function(){return this.app_},enumerable:!0,configurable:!0}),Object.defineProperty(_t.prototype,"INTERNAL",{get:function(){return this.internals_},enumerable:!0,configurable:!0}),_t);function _t(e,t,r,n){if(this.bucket_=null,this.authWrapper_=new ut(e,t,function(e,t){return new rt(e,t)},ft,this,r),this.app_=e,null!=n)this.bucket_=se.makeFromBucketSpec(n);else{var o=this.authWrapper_.bucket();null!=o&&(this.bucket_=new se(o,""));}this.internals_=new vt(this);}var vt=(mt.prototype.delete=function(){return this.service_.authWrapper_.deleteApp(),Promise.resolve()},mt);function mt(e){this.service_=e;}var bt,gt;function yt(e,t){var r=e.getProvider("app").getImmediate(),n=e.getProvider("auth-internal");return new dt(r,n,new re,t)}gt={TaskState:z,TaskEvent:D,StringFormat:U,Storage:dt,Reference:rt},(bt=wt).INTERNAL.registerComponent(new c("storage",yt,"PUBLIC").setServiceProps(gt).setMultipleInstances(!0)),bt.registerVersion("@firebase/storage","0.3.22");}).apply(this,arguments);}catch(e){throw console.error(e),new Error("Cannot instantiate firebase-storage - be sure to load firebase-app.js first.")}});

    });

    const firebaseConfig = {
      apiKey: "AIzaSyDbBan-UaYPzBKli9M7LxcTLtx9pYEfOL8",
      authDomain: "heroicpollsv2.firebaseapp.com",
      databaseURL: "https://heroicpollsv2.firebaseio.com",
      projectId: "heroicpollsv2",
      storageBucket: "heroicpollsv2.appspot.com",
      messagingSenderId: "309821722820",
      appId: "1:309821722820:web:f608f928df92e03d"
    };

    index_cjs$3.initializeApp(firebaseConfig);

    const Firestore = index_cjs$3.firestore();
    const Auth = index_cjs$3.auth();
    const Functions = index_cjs$3.app().functions("europe-west1");
    const Storage = index_cjs$3.storage();

    /* src/routes/public/Signin.svelte generated by Svelte v3.16.4 */
    const file$3 = "src/routes/public/Signin.svelte";

    function create_fragment$4(ctx) {
    	let div10;
    	let div9;
    	let div8;
    	let div6;
    	let div5;
    	let h1;
    	let t1;
    	let div4;
    	let form;
    	let div0;
    	let input0;
    	let t2;
    	let div1;
    	let input1;
    	let t3;
    	let div2;
    	let button;
    	let t5;
    	let div3;
    	let a;
    	let t7;
    	let div7;
    	let i;
    	let dispose;

    	const block = {
    		c: function create() {
    			div10 = element("div");
    			div9 = element("div");
    			div8 = element("div");
    			div6 = element("div");
    			div5 = element("div");
    			h1 = element("h1");
    			h1.textContent = "HeroicPolls";
    			t1 = space();
    			div4 = element("div");
    			form = element("form");
    			div0 = element("div");
    			input0 = element("input");
    			t2 = space();
    			div1 = element("div");
    			input1 = element("input");
    			t3 = space();
    			div2 = element("div");
    			button = element("button");
    			button.textContent = "Login";
    			t5 = space();
    			div3 = element("div");
    			a = element("a");
    			a.textContent = "Forgot Your Password?";
    			t7 = space();
    			div7 = element("div");
    			i = element("i");
    			i.textContent = "poll";
    			attr_dev(h1, "class", "text-4xl text-center font-thin");
    			add_location(h1, file$3, 25, 10, 739);
    			attr_dev(input0, "id", "email");
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "class", "flex-grow h-8 px-2 border rounded border-grey-400");
    			attr_dev(input0, "name", "email");
    			input0.value = "";
    			attr_dev(input0, "placeholder", "Email");
    			add_location(input0, file$3, 29, 16, 955);
    			attr_dev(div0, "class", "flex flex-col mt-4");
    			add_location(div0, file$3, 28, 14, 906);
    			attr_dev(input1, "id", "password");
    			attr_dev(input1, "type", "password");
    			attr_dev(input1, "class", "flex-grow h-8 px-2 rounded border border-grey-400");
    			attr_dev(input1, "name", "password");
    			input1.required = true;
    			attr_dev(input1, "placeholder", "Password");
    			add_location(input1, file$3, 39, 16, 1317);
    			attr_dev(div1, "class", "flex flex-col mt-4");
    			add_location(div1, file$3, 38, 14, 1268);
    			attr_dev(button, "type", "submit");
    			attr_dev(button, "class", "bg-blue-500 hover:bg-blue-700 text-white text-sm\n                  font-semibold py-2 px-4 rounded");
    			add_location(button, file$3, 49, 16, 1695);
    			attr_dev(div2, "class", "flex flex-col mt-8");
    			add_location(div2, file$3, 48, 14, 1646);
    			attr_dev(form, "class", "form-horizontal w-3/4 mx-auto");
    			add_location(form, file$3, 27, 12, 847);
    			attr_dev(a, "class", "no-underline hover:underline text-blue-dark text-xs");
    			attr_dev(a, "href", "/");
    			add_location(a, file$3, 59, 14, 2066);
    			attr_dev(div3, "class", "hidden text-center mt-4");
    			add_location(div3, file$3, 58, 12, 2014);
    			attr_dev(div4, "class", "w-full mt-4");
    			add_location(div4, file$3, 26, 10, 809);
    			attr_dev(div5, "class", "flex flex-col flex-1 justify-center mb-8");
    			add_location(div5, file$3, 24, 8, 674);
    			attr_dev(div6, "class", "flex flex-col w-full md:w-1/2 p-4");
    			add_location(div6, file$3, 23, 6, 618);
    			attr_dev(i, "class", "material-icons text-blue-500 m-auto");
    			set_style(i, "font-size", "300px");
    			add_location(i, file$3, 69, 8, 2375);
    			attr_dev(div7, "class", "hidden md:flex md:w-1/2 rounded-r-lg flex items-center");
    			add_location(div7, file$3, 68, 6, 2298);
    			attr_dev(div8, "class", "flex rounded-lg shadow-lg w-full sm:w-3/4 lg:w-1/2 bg-white sm:mx-0");
    			set_style(div8, "height", "500px");
    			add_location(div8, file$3, 20, 4, 496);
    			attr_dev(div9, "class", "flex flex-col items-center flex-1 h-full justify-center px-4 sm:px-0");
    			add_location(div9, file$3, 18, 2, 405);
    			attr_dev(div10, "class", "bg-blue-400 h-screen w-screen");
    			add_location(div10, file$3, 17, 0, 359);

    			dispose = [
    				listen_dev(input0, "input", /*input0_input_handler*/ ctx[3]),
    				listen_dev(input1, "input", /*input1_input_handler*/ ctx[4]),
    				listen_dev(button, "click", prevent_default(/*login*/ ctx[2]), false, true, false)
    			];
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div10, anchor);
    			append_dev(div10, div9);
    			append_dev(div9, div8);
    			append_dev(div8, div6);
    			append_dev(div6, div5);
    			append_dev(div5, h1);
    			append_dev(div5, t1);
    			append_dev(div5, div4);
    			append_dev(div4, form);
    			append_dev(form, div0);
    			append_dev(div0, input0);
    			set_input_value(input0, /*email*/ ctx[0]);
    			append_dev(form, t2);
    			append_dev(form, div1);
    			append_dev(div1, input1);
    			set_input_value(input1, /*password*/ ctx[1]);
    			append_dev(form, t3);
    			append_dev(form, div2);
    			append_dev(div2, button);
    			append_dev(div4, t5);
    			append_dev(div4, div3);
    			append_dev(div3, a);
    			append_dev(div8, t7);
    			append_dev(div8, div7);
    			append_dev(div7, i);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*email*/ 1 && input0.value !== /*email*/ ctx[0]) {
    				set_input_value(input0, /*email*/ ctx[0]);
    			}

    			if (dirty[0] & /*password*/ 2 && input1.value !== /*password*/ ctx[1]) {
    				set_input_value(input1, /*password*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div10);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let email = "";
    	let password = "";

    	const login = () => {
    		Auth.signInWithEmailAndPassword(email, password).then(() => {
    			replace("/admin");
    		}).catch(error => {
    			console.error("error", error);
    		});
    	};

    	function input0_input_handler() {
    		email = this.value;
    		$$invalidate(0, email);
    	}

    	function input1_input_handler() {
    		password = this.value;
    		$$invalidate(1, password);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("email" in $$props) $$invalidate(0, email = $$props.email);
    		if ("password" in $$props) $$invalidate(1, password = $$props.password);
    	};

    	return [email, password, login, input0_input_handler, input1_input_handler];
    }

    class Signin extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Signin",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/routes/public/Signup.svelte generated by Svelte v3.16.4 */

    const file$4 = "src/routes/public/Signup.svelte";

    function create_fragment$5(ctx) {
    	let h1;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Signup";
    			add_location(h1, file$4, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class Signup extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Signup",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/routes/public/Notfound.svelte generated by Svelte v3.16.4 */

    const file$5 = "src/routes/public/Notfound.svelte";

    function create_fragment$6(ctx) {
    	let h1;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Not Found";
    			add_location(h1, file$5, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class Notfound extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Notfound",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src/routes/public/routes.svelte generated by Svelte v3.16.4 */

    function create_fragment$7(ctx) {
    	let current;

    	const router = new Router({
    			props: { routes: /*routes*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(router.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(router, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(router, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self) {
    	const routes = {
    		"/": Home,
    		"/Signin": Signin,
    		"/signup": Signup,
    		"*": Notfound
    	};

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		
    	};

    	return [routes];
    }

    class Routes extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Routes",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src/routes/protected/sessions/sessions.svelte generated by Svelte v3.16.4 */

    const file$6 = "src/routes/protected/sessions/sessions.svelte";

    function create_fragment$8(ctx) {
    	let h1;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Sessions";
    			add_location(h1, file$6, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class Sessions extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Sessions",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src/routes/protected/session/session.svelte generated by Svelte v3.16.4 */

    const file$7 = "src/routes/protected/session/session.svelte";

    function create_fragment$9(ctx) {
    	let h1;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Session";
    			add_location(h1, file$7, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class Session extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Session",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    /* src/routes/protected/routes.svelte generated by Svelte v3.16.4 */
    const file$8 = "src/routes/protected/routes.svelte";

    function create_fragment$a(ctx) {
    	let h1;
    	let t1;
    	let current;

    	const router = new Router({
    			props: {
    				routes: /*routes*/ ctx[0],
    				prefix: "/admin"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Protected Routes";
    			t1 = space();
    			create_component(router.$$.fragment);
    			add_location(h1, file$8, 14, 0, 331);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(router, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			destroy_component(router, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self) {
    	const routes = {
    		"/": Sessions,
    		"/sessions": Sessions,
    		"/session": Session,
    		"*": Notfound
    	};

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		
    	};

    	return [routes];
    }

    class Routes$1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Routes",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    const userInfo = writable(null);

    const setUser = user => {
      userInfo.set(user);
    };

    const removeUser = () => {
      userInfo.set(null);
    };

    const currentUser = {
      subscribe: userInfo.subscribe,
      set: setUser,
      remove: removeUser
    };

    /** PURE_IMPORTS_START  PURE_IMPORTS_END */
    function isFunction(x) {
        return typeof x === 'function';
    }

    /** PURE_IMPORTS_START  PURE_IMPORTS_END */
    var _enable_super_gross_mode_that_will_cause_bad_things = false;
    var config = {
        Promise: undefined,
        set useDeprecatedSynchronousErrorHandling(value) {
            if (value) {
                var error = /*@__PURE__*/ new Error();
                /*@__PURE__*/ console.warn('DEPRECATED! RxJS was set to use deprecated synchronous error handling behavior by code at: \n' + error.stack);
            }
            _enable_super_gross_mode_that_will_cause_bad_things = value;
        },
        get useDeprecatedSynchronousErrorHandling() {
            return _enable_super_gross_mode_that_will_cause_bad_things;
        },
    };

    /** PURE_IMPORTS_START  PURE_IMPORTS_END */
    function hostReportError(err) {
        setTimeout(function () { throw err; }, 0);
    }

    /** PURE_IMPORTS_START _config,_util_hostReportError PURE_IMPORTS_END */
    var empty$1 = {
        closed: true,
        next: function (value) { },
        error: function (err) {
            if (config.useDeprecatedSynchronousErrorHandling) {
                throw err;
            }
            else {
                hostReportError(err);
            }
        },
        complete: function () { }
    };

    /** PURE_IMPORTS_START  PURE_IMPORTS_END */
    var isArray = /*@__PURE__*/ (function () { return Array.isArray || (function (x) { return x && typeof x.length === 'number'; }); })();

    /** PURE_IMPORTS_START  PURE_IMPORTS_END */
    function isObject(x) {
        return x !== null && typeof x === 'object';
    }

    /** PURE_IMPORTS_START  PURE_IMPORTS_END */
    var UnsubscriptionErrorImpl = /*@__PURE__*/ (function () {
        function UnsubscriptionErrorImpl(errors) {
            Error.call(this);
            this.message = errors ?
                errors.length + " errors occurred during unsubscription:\n" + errors.map(function (err, i) { return i + 1 + ") " + err.toString(); }).join('\n  ') : '';
            this.name = 'UnsubscriptionError';
            this.errors = errors;
            return this;
        }
        UnsubscriptionErrorImpl.prototype = /*@__PURE__*/ Object.create(Error.prototype);
        return UnsubscriptionErrorImpl;
    })();
    var UnsubscriptionError = UnsubscriptionErrorImpl;

    /** PURE_IMPORTS_START _util_isArray,_util_isObject,_util_isFunction,_util_UnsubscriptionError PURE_IMPORTS_END */
    var Subscription = /*@__PURE__*/ (function () {
        function Subscription(unsubscribe) {
            this.closed = false;
            this._parentOrParents = null;
            this._subscriptions = null;
            if (unsubscribe) {
                this._unsubscribe = unsubscribe;
            }
        }
        Subscription.prototype.unsubscribe = function () {
            var errors;
            if (this.closed) {
                return;
            }
            var _a = this, _parentOrParents = _a._parentOrParents, _unsubscribe = _a._unsubscribe, _subscriptions = _a._subscriptions;
            this.closed = true;
            this._parentOrParents = null;
            this._subscriptions = null;
            if (_parentOrParents instanceof Subscription) {
                _parentOrParents.remove(this);
            }
            else if (_parentOrParents !== null) {
                for (var index = 0; index < _parentOrParents.length; ++index) {
                    var parent_1 = _parentOrParents[index];
                    parent_1.remove(this);
                }
            }
            if (isFunction(_unsubscribe)) {
                try {
                    _unsubscribe.call(this);
                }
                catch (e) {
                    errors = e instanceof UnsubscriptionError ? flattenUnsubscriptionErrors(e.errors) : [e];
                }
            }
            if (isArray(_subscriptions)) {
                var index = -1;
                var len = _subscriptions.length;
                while (++index < len) {
                    var sub = _subscriptions[index];
                    if (isObject(sub)) {
                        try {
                            sub.unsubscribe();
                        }
                        catch (e) {
                            errors = errors || [];
                            if (e instanceof UnsubscriptionError) {
                                errors = errors.concat(flattenUnsubscriptionErrors(e.errors));
                            }
                            else {
                                errors.push(e);
                            }
                        }
                    }
                }
            }
            if (errors) {
                throw new UnsubscriptionError(errors);
            }
        };
        Subscription.prototype.add = function (teardown) {
            var subscription = teardown;
            if (!teardown) {
                return Subscription.EMPTY;
            }
            switch (typeof teardown) {
                case 'function':
                    subscription = new Subscription(teardown);
                case 'object':
                    if (subscription === this || subscription.closed || typeof subscription.unsubscribe !== 'function') {
                        return subscription;
                    }
                    else if (this.closed) {
                        subscription.unsubscribe();
                        return subscription;
                    }
                    else if (!(subscription instanceof Subscription)) {
                        var tmp = subscription;
                        subscription = new Subscription();
                        subscription._subscriptions = [tmp];
                    }
                    break;
                default: {
                    throw new Error('unrecognized teardown ' + teardown + ' added to Subscription.');
                }
            }
            var _parentOrParents = subscription._parentOrParents;
            if (_parentOrParents === null) {
                subscription._parentOrParents = this;
            }
            else if (_parentOrParents instanceof Subscription) {
                if (_parentOrParents === this) {
                    return subscription;
                }
                subscription._parentOrParents = [_parentOrParents, this];
            }
            else if (_parentOrParents.indexOf(this) === -1) {
                _parentOrParents.push(this);
            }
            else {
                return subscription;
            }
            var subscriptions = this._subscriptions;
            if (subscriptions === null) {
                this._subscriptions = [subscription];
            }
            else {
                subscriptions.push(subscription);
            }
            return subscription;
        };
        Subscription.prototype.remove = function (subscription) {
            var subscriptions = this._subscriptions;
            if (subscriptions) {
                var subscriptionIndex = subscriptions.indexOf(subscription);
                if (subscriptionIndex !== -1) {
                    subscriptions.splice(subscriptionIndex, 1);
                }
            }
        };
        Subscription.EMPTY = (function (empty) {
            empty.closed = true;
            return empty;
        }(new Subscription()));
        return Subscription;
    }());
    function flattenUnsubscriptionErrors(errors) {
        return errors.reduce(function (errs, err) { return errs.concat((err instanceof UnsubscriptionError) ? err.errors : err); }, []);
    }

    /** PURE_IMPORTS_START  PURE_IMPORTS_END */
    var rxSubscriber = /*@__PURE__*/ (function () {
        return typeof Symbol === 'function'
            ? /*@__PURE__*/ Symbol('rxSubscriber')
            : '@@rxSubscriber_' + /*@__PURE__*/ Math.random();
    })();

    /** PURE_IMPORTS_START tslib,_util_isFunction,_Observer,_Subscription,_internal_symbol_rxSubscriber,_config,_util_hostReportError PURE_IMPORTS_END */
    var Subscriber = /*@__PURE__*/ (function (_super) {
        __extends(Subscriber, _super);
        function Subscriber(destinationOrNext, error, complete) {
            var _this = _super.call(this) || this;
            _this.syncErrorValue = null;
            _this.syncErrorThrown = false;
            _this.syncErrorThrowable = false;
            _this.isStopped = false;
            switch (arguments.length) {
                case 0:
                    _this.destination = empty$1;
                    break;
                case 1:
                    if (!destinationOrNext) {
                        _this.destination = empty$1;
                        break;
                    }
                    if (typeof destinationOrNext === 'object') {
                        if (destinationOrNext instanceof Subscriber) {
                            _this.syncErrorThrowable = destinationOrNext.syncErrorThrowable;
                            _this.destination = destinationOrNext;
                            destinationOrNext.add(_this);
                        }
                        else {
                            _this.syncErrorThrowable = true;
                            _this.destination = new SafeSubscriber(_this, destinationOrNext);
                        }
                        break;
                    }
                default:
                    _this.syncErrorThrowable = true;
                    _this.destination = new SafeSubscriber(_this, destinationOrNext, error, complete);
                    break;
            }
            return _this;
        }
        Subscriber.prototype[rxSubscriber] = function () { return this; };
        Subscriber.create = function (next, error, complete) {
            var subscriber = new Subscriber(next, error, complete);
            subscriber.syncErrorThrowable = false;
            return subscriber;
        };
        Subscriber.prototype.next = function (value) {
            if (!this.isStopped) {
                this._next(value);
            }
        };
        Subscriber.prototype.error = function (err) {
            if (!this.isStopped) {
                this.isStopped = true;
                this._error(err);
            }
        };
        Subscriber.prototype.complete = function () {
            if (!this.isStopped) {
                this.isStopped = true;
                this._complete();
            }
        };
        Subscriber.prototype.unsubscribe = function () {
            if (this.closed) {
                return;
            }
            this.isStopped = true;
            _super.prototype.unsubscribe.call(this);
        };
        Subscriber.prototype._next = function (value) {
            this.destination.next(value);
        };
        Subscriber.prototype._error = function (err) {
            this.destination.error(err);
            this.unsubscribe();
        };
        Subscriber.prototype._complete = function () {
            this.destination.complete();
            this.unsubscribe();
        };
        Subscriber.prototype._unsubscribeAndRecycle = function () {
            var _parentOrParents = this._parentOrParents;
            this._parentOrParents = null;
            this.unsubscribe();
            this.closed = false;
            this.isStopped = false;
            this._parentOrParents = _parentOrParents;
            return this;
        };
        return Subscriber;
    }(Subscription));
    var SafeSubscriber = /*@__PURE__*/ (function (_super) {
        __extends(SafeSubscriber, _super);
        function SafeSubscriber(_parentSubscriber, observerOrNext, error, complete) {
            var _this = _super.call(this) || this;
            _this._parentSubscriber = _parentSubscriber;
            var next;
            var context = _this;
            if (isFunction(observerOrNext)) {
                next = observerOrNext;
            }
            else if (observerOrNext) {
                next = observerOrNext.next;
                error = observerOrNext.error;
                complete = observerOrNext.complete;
                if (observerOrNext !== empty$1) {
                    context = Object.create(observerOrNext);
                    if (isFunction(context.unsubscribe)) {
                        _this.add(context.unsubscribe.bind(context));
                    }
                    context.unsubscribe = _this.unsubscribe.bind(_this);
                }
            }
            _this._context = context;
            _this._next = next;
            _this._error = error;
            _this._complete = complete;
            return _this;
        }
        SafeSubscriber.prototype.next = function (value) {
            if (!this.isStopped && this._next) {
                var _parentSubscriber = this._parentSubscriber;
                if (!config.useDeprecatedSynchronousErrorHandling || !_parentSubscriber.syncErrorThrowable) {
                    this.__tryOrUnsub(this._next, value);
                }
                else if (this.__tryOrSetError(_parentSubscriber, this._next, value)) {
                    this.unsubscribe();
                }
            }
        };
        SafeSubscriber.prototype.error = function (err) {
            if (!this.isStopped) {
                var _parentSubscriber = this._parentSubscriber;
                var useDeprecatedSynchronousErrorHandling = config.useDeprecatedSynchronousErrorHandling;
                if (this._error) {
                    if (!useDeprecatedSynchronousErrorHandling || !_parentSubscriber.syncErrorThrowable) {
                        this.__tryOrUnsub(this._error, err);
                        this.unsubscribe();
                    }
                    else {
                        this.__tryOrSetError(_parentSubscriber, this._error, err);
                        this.unsubscribe();
                    }
                }
                else if (!_parentSubscriber.syncErrorThrowable) {
                    this.unsubscribe();
                    if (useDeprecatedSynchronousErrorHandling) {
                        throw err;
                    }
                    hostReportError(err);
                }
                else {
                    if (useDeprecatedSynchronousErrorHandling) {
                        _parentSubscriber.syncErrorValue = err;
                        _parentSubscriber.syncErrorThrown = true;
                    }
                    else {
                        hostReportError(err);
                    }
                    this.unsubscribe();
                }
            }
        };
        SafeSubscriber.prototype.complete = function () {
            var _this = this;
            if (!this.isStopped) {
                var _parentSubscriber = this._parentSubscriber;
                if (this._complete) {
                    var wrappedComplete = function () { return _this._complete.call(_this._context); };
                    if (!config.useDeprecatedSynchronousErrorHandling || !_parentSubscriber.syncErrorThrowable) {
                        this.__tryOrUnsub(wrappedComplete);
                        this.unsubscribe();
                    }
                    else {
                        this.__tryOrSetError(_parentSubscriber, wrappedComplete);
                        this.unsubscribe();
                    }
                }
                else {
                    this.unsubscribe();
                }
            }
        };
        SafeSubscriber.prototype.__tryOrUnsub = function (fn, value) {
            try {
                fn.call(this._context, value);
            }
            catch (err) {
                this.unsubscribe();
                if (config.useDeprecatedSynchronousErrorHandling) {
                    throw err;
                }
                else {
                    hostReportError(err);
                }
            }
        };
        SafeSubscriber.prototype.__tryOrSetError = function (parent, fn, value) {
            if (!config.useDeprecatedSynchronousErrorHandling) {
                throw new Error('bad call');
            }
            try {
                fn.call(this._context, value);
            }
            catch (err) {
                if (config.useDeprecatedSynchronousErrorHandling) {
                    parent.syncErrorValue = err;
                    parent.syncErrorThrown = true;
                    return true;
                }
                else {
                    hostReportError(err);
                    return true;
                }
            }
            return false;
        };
        SafeSubscriber.prototype._unsubscribe = function () {
            var _parentSubscriber = this._parentSubscriber;
            this._context = null;
            this._parentSubscriber = null;
            _parentSubscriber.unsubscribe();
        };
        return SafeSubscriber;
    }(Subscriber));

    /** PURE_IMPORTS_START _Subscriber PURE_IMPORTS_END */
    function canReportError(observer) {
        while (observer) {
            var _a = observer, closed_1 = _a.closed, destination = _a.destination, isStopped = _a.isStopped;
            if (closed_1 || isStopped) {
                return false;
            }
            else if (destination && destination instanceof Subscriber) {
                observer = destination;
            }
            else {
                observer = null;
            }
        }
        return true;
    }

    /** PURE_IMPORTS_START _Subscriber,_symbol_rxSubscriber,_Observer PURE_IMPORTS_END */
    function toSubscriber(nextOrObserver, error, complete) {
        if (nextOrObserver) {
            if (nextOrObserver instanceof Subscriber) {
                return nextOrObserver;
            }
            if (nextOrObserver[rxSubscriber]) {
                return nextOrObserver[rxSubscriber]();
            }
        }
        if (!nextOrObserver && !error && !complete) {
            return new Subscriber(empty$1);
        }
        return new Subscriber(nextOrObserver, error, complete);
    }

    /** PURE_IMPORTS_START  PURE_IMPORTS_END */
    var observable = /*@__PURE__*/ (function () { return typeof Symbol === 'function' && Symbol.observable || '@@observable'; })();

    /** PURE_IMPORTS_START  PURE_IMPORTS_END */
    function noop$1() { }

    /** PURE_IMPORTS_START _noop PURE_IMPORTS_END */
    function pipeFromArray(fns) {
        if (!fns) {
            return noop$1;
        }
        if (fns.length === 1) {
            return fns[0];
        }
        return function piped(input) {
            return fns.reduce(function (prev, fn) { return fn(prev); }, input);
        };
    }

    /** PURE_IMPORTS_START _util_canReportError,_util_toSubscriber,_symbol_observable,_util_pipe,_config PURE_IMPORTS_END */
    var Observable = /*@__PURE__*/ (function () {
        function Observable(subscribe) {
            this._isScalar = false;
            if (subscribe) {
                this._subscribe = subscribe;
            }
        }
        Observable.prototype.lift = function (operator) {
            var observable = new Observable();
            observable.source = this;
            observable.operator = operator;
            return observable;
        };
        Observable.prototype.subscribe = function (observerOrNext, error, complete) {
            var operator = this.operator;
            var sink = toSubscriber(observerOrNext, error, complete);
            if (operator) {
                sink.add(operator.call(sink, this.source));
            }
            else {
                sink.add(this.source || (config.useDeprecatedSynchronousErrorHandling && !sink.syncErrorThrowable) ?
                    this._subscribe(sink) :
                    this._trySubscribe(sink));
            }
            if (config.useDeprecatedSynchronousErrorHandling) {
                if (sink.syncErrorThrowable) {
                    sink.syncErrorThrowable = false;
                    if (sink.syncErrorThrown) {
                        throw sink.syncErrorValue;
                    }
                }
            }
            return sink;
        };
        Observable.prototype._trySubscribe = function (sink) {
            try {
                return this._subscribe(sink);
            }
            catch (err) {
                if (config.useDeprecatedSynchronousErrorHandling) {
                    sink.syncErrorThrown = true;
                    sink.syncErrorValue = err;
                }
                if (canReportError(sink)) {
                    sink.error(err);
                }
                else {
                    console.warn(err);
                }
            }
        };
        Observable.prototype.forEach = function (next, promiseCtor) {
            var _this = this;
            promiseCtor = getPromiseCtor(promiseCtor);
            return new promiseCtor(function (resolve, reject) {
                var subscription;
                subscription = _this.subscribe(function (value) {
                    try {
                        next(value);
                    }
                    catch (err) {
                        reject(err);
                        if (subscription) {
                            subscription.unsubscribe();
                        }
                    }
                }, reject, resolve);
            });
        };
        Observable.prototype._subscribe = function (subscriber) {
            var source = this.source;
            return source && source.subscribe(subscriber);
        };
        Observable.prototype[observable] = function () {
            return this;
        };
        Observable.prototype.pipe = function () {
            var operations = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                operations[_i] = arguments[_i];
            }
            if (operations.length === 0) {
                return this;
            }
            return pipeFromArray(operations)(this);
        };
        Observable.prototype.toPromise = function (promiseCtor) {
            var _this = this;
            promiseCtor = getPromiseCtor(promiseCtor);
            return new promiseCtor(function (resolve, reject) {
                var value;
                _this.subscribe(function (x) { return value = x; }, function (err) { return reject(err); }, function () { return resolve(value); });
            });
        };
        Observable.create = function (subscribe) {
            return new Observable(subscribe);
        };
        return Observable;
    }());
    function getPromiseCtor(promiseCtor) {
        if (!promiseCtor) {
            promiseCtor =  Promise;
        }
        if (!promiseCtor) {
            throw new Error('no Promise impl found');
        }
        return promiseCtor;
    }

    /**
     * @license
     * Copyright 2018 Google Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    /**
     * Create an observable of authentication state. The observer is only
     * triggered on sign-in or sign-out.
     * @param auth firebase.auth.Auth
     */
    function authState(auth) {
        return new Observable(function (subscriber) {
            var unsubscribe = auth.onAuthStateChanged(subscriber);
            return { unsubscribe: unsubscribe };
        });
    }

    const FirebaseEmployees = Firestore.collection("users");

    const findOne = employeeId => {
      return FirebaseEmployees.doc(employeeId).get();
    };

    var FbEmployees = { findOne };

    const watchAuthState = () => {
      const unsubscribe = authState(Auth).subscribe(u => {
        if (Auth.currentUser) {
          let userInfo = {
            email: Auth.currentUser.email,
            id: Auth.currentUser.uid,
            phoneNumber: Auth.currentUser.phoneNumber,
            photoUrl: Auth.currentUser.photoUrl
          };

          FbEmployees.findOne(userInfo.id).then(doc => {
            userInfo = { ...userInfo, ...doc.data(), id: doc.id };

            Auth.currentUser.getIdTokenResult().then(idTokenResult => {
              userInfo.claims = idTokenResult.claims;
              console.log("userInfoxx", userInfo);
              currentUser.set(userInfo);
              return;
            });
          });
        } else {
          currentUser.set({ id: 0 });
        }
      });
    };

    const signOut = () => {
      Auth.signOut();
    };

    /* src/routes/routes.svelte generated by Svelte v3.16.4 */

    // (46:0) {:else}
    function create_else_block$1(ctx) {
    	let t;
    	let current;
    	let if_block = /*$location*/ ctx[2] !== "/signin" && create_if_block_1$1(ctx);

    	const router = new Router({
    			props: { routes: /*routes*/ ctx[3] },
    			$$inline: true
    		});

    	router.$on("conditionsFailed", /*conditionsFailed*/ ctx[4]);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			t = space();
    			create_component(router.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(router, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*$location*/ ctx[2] !== "/signin") {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block_1$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(t.parentNode, t);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(router, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(46:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (44:0) {#if !showPage}
    function create_if_block$1(ctx) {
    	let current;
    	const loading = new Loading({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(loading.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(loading, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(loading.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(loading.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(loading, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(44:0) {#if !showPage}",
    		ctx
    	});

    	return block;
    }

    // (47:2) {#if $location !== '/signin'}
    function create_if_block_1$1(ctx) {
    	let current;

    	const nav = new Nav({
    			props: { user: /*$currentUser*/ ctx[1] },
    			$$inline: true
    		});

    	nav.$on("logout", /*logout*/ ctx[5]);

    	const block = {
    		c: function create() {
    			create_component(nav.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(nav, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const nav_changes = {};
    			if (dirty[0] & /*$currentUser*/ 2) nav_changes.user = /*$currentUser*/ ctx[1];
    			nav.$set(nav_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(nav.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(nav.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(nav, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(47:2) {#if $location !== '/signin'}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$b(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$1, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (!/*showPage*/ ctx[0]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let $currentUser;
    	let $location;
    	validate_store(currentUser, "currentUser");
    	component_subscribe($$self, currentUser, $$value => $$invalidate(1, $currentUser = $$value));
    	validate_store(location, "location");
    	component_subscribe($$self, location, $$value => $$invalidate(2, $location = $$value));
    	let showPage = false;
    	watchAuthState();

    	const routes = {
    		"/admin": wrap(Routes$1, detail => {
    			console.log("check protected1", $currentUser && $currentUser.id !== 0);
    			return $currentUser && $currentUser.id !== 0;
    		}),
    		"/admin/*": wrap(Routes$1, detail => {
    			console.log("check protected2", $currentUser && $currentUser.id !== 0);
    			return $currentUser && $currentUser.id !== 0;
    		}),
    		"*": wrap(Routes, detail => {
    			return true;
    		})
    	};

    	const conditionsFailed = event => {
    		console.log("conditionFailed", event);
    		replace("/signin");
    	};

    	const logout = () => {
    		signOut();
    	};

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("showPage" in $$props) $$invalidate(0, showPage = $$props.showPage);
    		if ("$currentUser" in $$props) currentUser.set($currentUser = $$props.$currentUser);
    		if ("$location" in $$props) location.set($location = $$props.$location);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*$currentUser*/ 2) {
    			 if (!$currentUser) {
    				$$invalidate(0, showPage = false);
    			} else {
    				$$invalidate(0, showPage = true);
    			}
    		}
    	};

    	return [showPage, $currentUser, $location, routes, conditionsFailed, logout];
    }

    class Routes$2 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$b, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Routes",
    			options,
    			id: create_fragment$b.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.16.4 */

    function create_fragment$c(ctx) {
    	let current;
    	const routes = new Routes$2({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(routes.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(routes, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(routes.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(routes.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(routes, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$c, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$c.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
