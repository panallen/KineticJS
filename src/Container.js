(function() {
    Kinetic.Util.addMethods(Kinetic.Container, {
        __init: function(config) {
            this.children = new Kinetic.Collection();
            Kinetic.Node.call(this, config);
        },
        /**
         * returns a {@link Kinetic.Collection} of direct descendant nodes
         * @method
         * @memberof Kinetic.Container.prototype
         */
        getChildren: function() {
            return this.children;
        },
        /**
         * determine if node has children
         * @method
         * @memberof Kinetic.Container.prototype
         */
        hasChildren: function() {
            return this.getChildren().length > 0;
        },
        /**
         * remove all children
         * @method
         * @memberof Kinetic.Container.prototype
         */
        removeChildren: function() {
            var children = this.children,
                child;

            while(children.length > 0) {
                child = children[0];
                if (child.hasChildren()) {
                    child.removeChildren();
                }
                child.remove();
            }

            return this;
        },
        /**
         * destroy all children
         * @method
         * @memberof Kinetic.Container.prototype
         */
        destroyChildren: function() {
            var children = this.children;
            while(children.length > 0) {
                children[0].destroy();
            }
            return this;
        },
        /**
         * add node to container
         * @method
         * @memberof Kinetic.Container.prototype
         * @param {Node} child
         */
        add: function(child) {
            var go = Kinetic.Global,
                children = this.children;

            this._validateAdd(child);
            child.index = children.length;
            child.parent = this;
            children.push(child);
            this._fire('add', {
                child: child
            });

            // chainable
            return this;
        },
        destroy: function() {
            // destroy children
            if (this.hasChildren()) {
                this.destroyChildren();
            }
            // then destroy self
            Kinetic.Node.prototype.destroy.call(this);
        },
        /**
         * return a {@link Kinetic.Collection} of nodes that match the selector.  Use '#' for id selections
         * and '.' for name selections.  You can also select by type or class name. Pass multiple selectors
         * separated by a space.
         * @method
         * @memberof Kinetic.Container.prototype
         * @param {String} selector
         * @example
         * // select node with id foo<br>
         * var node = stage.get('#foo');<br><br>
         *
         * // select nodes with name bar inside layer<br>
         * var nodes = layer.get('.bar');<br><br>
         *
         * // select all groups inside layer<br>
         * var nodes = layer.get('Group');<br><br>
         *
         * // select all rectangles inside layer<br>
         * var nodes = layer.get('Rect');<br><br>
         *
         * // select node with an id of foo or a name of bar inside layer<br>
         * var nodes = layer.get('#foo, .bar');
         */
        get: function(selector) {
            var retArr = [],
                selectorArr = selector.replace(/ /g, '').split(','),
                len = selectorArr.length,
                n, i, sel, arr, node, children, clen;

            for (n = 0; n < len; n++) {
                sel = selectorArr[n];

                // id selector
                if(sel.charAt(0) === '#') {
                    node = this._getNodeById(sel.slice(1));
                    if(node) {
                        retArr.push(node);
                    }
                }
                // name selector
                else if(sel.charAt(0) === '.') {
                    arr = this._getNodesByName(sel.slice(1));
                    retArr = retArr.concat(arr);
                }
                // unrecognized selector, pass to children
                else {
                    children = this.getChildren();
                    clen = children.length;
                    for(i = 0; i < clen; i++) {
                        retArr = retArr.concat(children[i]._get(sel));
                    }
                }
            }

            return Kinetic.Collection.toCollection(retArr);
        },
        _getNodeById: function(key) {
            var stage = this.getStage(), go = Kinetic.Global, node = go.ids[key];
            if(node !== undefined && this.isAncestorOf(node)) {
                return node;
            }
            return null;
        },
        _getNodesByName: function(key) {
            var go = Kinetic.Global, arr = go.names[key] || [];
            return this._getDescendants(arr);
        },
        _get: function(selector) {
            var retArr = Kinetic.Node.prototype._get.call(this, selector);
            var children = this.getChildren();
            var len = children.length;
            for(var n = 0; n < len; n++) {
                retArr = retArr.concat(children[n]._get(selector));
            }
            return retArr;
        },
        // extenders
        toObject: function() {
            var obj = Kinetic.Node.prototype.toObject.call(this);

            obj.children = [];

            var children = this.getChildren();
            var len = children.length;
            for(var n = 0; n < len; n++) {
                var child = children[n];
                obj.children.push(child.toObject());
            }

            return obj;
        },
        _getDescendants: function(arr) {
            var retArr = [];
            var len = arr.length;
            for(var n = 0; n < len; n++) {
                var node = arr[n];
                if(this.isAncestorOf(node)) {
                    retArr.push(node);
                }
            }

            return retArr;
        },
        /**
         * determine if node is an ancestor
         * of descendant
         * @method
         * @memberof Kinetic.Container.prototype
         * @param {Kinetic.Node} node
         */
        isAncestorOf: function(node) {
            var parent = node.getParent();
            while(parent) {
                if(parent._id === this._id) {
                    return true;
                }
                parent = parent.getParent();
            }

            return false;
        },
        clone: function(obj) {
            // call super method
            var node = Kinetic.Node.prototype.clone.call(this, obj);

            this.getChildren().each(function(no) {
                node.add(no.clone());
            });
            return node;
        },
        /**
         * get all shapes that intersect a point.  Note: because this method must clear a temporary
         * canvas and redraw every shape inside the container, it should only be used for special sitations
         * because it performs very poorly.  Please use the {@link Kinetic.Stage#getIntersection} method if at all possible
         * because it performs much better
         * @method
         * @memberof Kinetic.Container.prototype
         * @param {Object} pos
         */
        getAllIntersections: function() {
            var pos = Kinetic.Util._getXY(Array.prototype.slice.call(arguments));
            var arr = [];
            var shapes = this.get('Shape');

            var len = shapes.length;
            for(var n = 0; n < len; n++) {
                var shape = shapes[n];
                if(shape.isVisible() && shape.intersects(pos)) {
                    arr.push(shape);
                }
            }

            return arr;
        },
        _setChildrenIndices: function() {
            var children = this.children, len = children.length;
            for(var n = 0; n < len; n++) {
                children[n].index = n;
            }
        },
        drawScene: function(canvas) {
            var layer = this.getLayer(),
                clip = !!this.getClipFunc(),
                children, n, len;

            if (!canvas && layer) {
                canvas = layer.getCanvas();
            }

            if(this.isVisible()) {
                if (clip) {
                    canvas._clip(this);
                }

                children = this.children;
                len = children.length;

                for(n = 0; n < len; n++) {
                    children[n].drawScene(canvas);
                }

                if (clip) {
                    canvas.getContext().restore();
                }
            }

            return this;
        },
        drawHit: function() {
            var clip = !!this.getClipFunc() && this.nodeType !== 'Stage',
                n = 0,
                len = 0,
                children = [],
                hitCanvas;

            if(this.shouldDrawHit()) {
                if (clip) {
                    hitCanvas = this.getLayer().hitCanvas;
                    hitCanvas._clip(this);
                }

                children = this.children;
                len = children.length;

                for(n = 0; n < len; n++) {
                    children[n].drawHit();
                }
                if (clip) {
                    hitCanvas.getContext().restore();
                }
            }

            return this;
        }
    });

    Kinetic.Util.extend(Kinetic.Container, Kinetic.Node);

    // add getters setters
    Kinetic.Node.addGetterSetter(Kinetic.Container, 'clipFunc');

    /**
     * set clipping function
     * @name setClipFunc
     * @method
     * @memberof Kinetic.Container.prototype
     * @param {Number} deg
     */

    /**
     * get clipping function
     * @name getClipFunc
     * @method
     * @memberof Kinetic.Container.prototype
     */
})();
