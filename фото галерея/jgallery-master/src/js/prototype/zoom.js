var Zoom = ( function( jLoader, overlay, historyPushState, jGalleryTransitions, jGalleryArrayTransitions, jGalleryBackwardTransitions, AdvancedAnimation, IconChangeAlbum ) {
    var $ = jQuery;
    var $body = $( 'body' );
    
    $.fn.jLoader = jLoader;
    $.fn.overlay = overlay;
    
    var Zoom = function( jGallery ) {
        this.$container = jGallery.$element.children( '.zoom-container' );
        this.$element = this.$container.children( '.zoom' );
        this.$title = this.$container.find( '.nav-bottom > .title' );
        this.$btnPrev = this.$container.children( '.prev' );
        this.$btnNext = this.$container.children( '.next' );
        this.$left = this.$container.find( '.left' );
        this.$right = this.$container.find( '.right' );
        this.thumbnails = jGallery.thumbnails;
        this.$jGallery = jGallery.$element;
        this.jGallery = jGallery;
        this.$resize = this.$container.find( '.resize' );
        this.$dragNav = this.$container.find( '.drag-nav' );
        this.$dragNavCrop = $();
        this.$dragNavCropImg = $();
        this.$changeMode = this.$container.find( '.fa.change-mode' );
        this.$random = this.$container.find( '.random' );
        this.$slideshow = this.$container.find( '.slideshow' );
        this.intJGalleryId = this.$jGallery.attr( 'data-jgallery-id' );
        this.booSlideshowPlayed = false;
        this.booLoadingInProgress = false;
        this.booLoadedAll = false;
        this.$title.on( 'click', function() {
            $( this ).toggleClass( 'expanded' );
        } );
        this.update();
    };

    Zoom.prototype = {
        update: function() {
            var transition = jGalleryTransitions[ this.jGallery.options.transition ];

            this.$container.attr( 'data-size', this.jGallery.options.zoomSize );
            this.$element.find( '.pt-page' )
                .removeClass( this.jGallery.options.hideEffect )
                .removeClass( this.jGallery.options.showEffect );
            if ( typeof transition !== 'undefined' ) {
                this.jGallery.options.hideEffect = transition[ 0 ];
                this.jGallery.options.showEffect = transition[ 1 ];
            }
            this.initAdvancedAnimation();  
        },

        initAdvancedAnimation: function() {
            if ( typeof this.advancedAnimation === 'undefined' ) {
                this.advancedAnimation = new AdvancedAnimation( this.$element );
            }
            this.advancedAnimation.setAnimationProperties( { 
                duration: this.jGallery.options.transitionDuration,
                transitionTimingFunction: this.jGallery.options.transitionTimingFunction
            } );
            this.advancedAnimation.setDirection( this.jGallery.options.transitionWaveDirection );
            this.advancedAnimation.setQuantityParts( this.jGallery.options.transitionCols, this.jGallery.options.transitionRows );
            this.advancedAnimation.setHideEffect( this.jGallery.options.hideEffect );
            this.advancedAnimation.setShowEffect( this.jGallery.options.showEffect );
        },

        setThumbnails: function( thumbnails ) {
            this.thumbnails = thumbnails;
        },

        enableDrag: function() {
            if ( ! this.jGallery.options.draggableZoom ) {
                return;
            }
            var self = this;
            var startMarginLeft;
            var startMarginTop;

            var startDrag = function( event ) {
                var startX = event.pageX;
                var startY = event.pageY;
                var $img = self.$element.find( 'img.active' );

                startMarginLeft = $img.css( 'margin-left' );
                startMarginTop = $img.css( 'margin-top' );
                self.$element.on( {
                    mousemove: function( event ) { 
                        drag( event.pageX - startX, event.pageY - startY );
                    },
                    mouseleave: function() {
                        stopDrag();
                    }
                } );
                if ( self.jGallery.options.zoomSize === 'fill' ) {
                    self.$dragNav.removeClass( 'hide' ).addClass( 'show' );
                }
                drag( 0, 0 );
            };

            var stopDrag = function() {
                self.$element.off( 'mousemove' );
                if ( self.jGallery.options.zoomSize === 'fill' ) {
                    self.$dragNav.removeClass( 'show' ).addClass( 'hide' );
                }
            };

            var drag = function( x, y ) {
                var marginLeft = parseFloat( parseFloat( startMarginLeft ) + x );
                var marginTop = parseFloat( parseFloat( startMarginTop ) + y );
                var $img = self.$element.find( 'img.active' );
                var $first = $img.eq( 0 );
                var $last = $img.eq( -1 );
                var $lastParent = $last.parent();

                if ( $first.position().left + marginLeft < 0 && $last.position().left + $last.width() + marginLeft > $lastParent.outerWidth() ) {
                    $img.css( {
                        'margin-left': marginLeft
                    } );
                    self.$dragNavCrop.css( {
                        left: - ( $first.position().left + marginLeft ) / $img.width() * 100 + '%'
                    } );
                }
                if ( $first.position().top + marginTop < 0 && $last.position().top + $last.height() + marginTop > $lastParent.outerHeight() ) {
                    $img.css( {
                        'margin-top': marginTop
                    } );
                    self.$dragNavCrop.css( {
                        top: - ( $first.position().top + marginTop ) / $img.height() * 100 + '%'
                    } );
                }
                self.$dragNavCropImg.css( {
                    'margin-left': - self.$dragNavCrop.position().left,
                    'margin-top': - self.$dragNavCrop.position().top
                } );
            };

            if ( self.jGallery.options.zoomSize === 'original' ) {
                self.$dragNav.removeClass( 'hide' ).addClass( 'show' );
            }
            this.refreshDragNavCropSize();
            this.$element.css( 'cursor', 'move' ).on( {
                mousedown: function( event ) {
                    event.preventDefault();
                    startDrag( event );
                    self.slideshowPause();
                },
                mouseup: function() {
                    stopDrag();
                }
            } );
            this.$left.add( this.$right ).hide();
        },

        disableDrag: function() {
            if ( ! this.jGallery.options.draggableZoom ) {
                return;
            }
            this.$dragNav.removeClass( 'show' ).addClass( 'hide' );
            this.$element.css( 'cursor', 'default' );
            this.$element.off();
            this.$left.add( this.$right ).show(); 
        },

        refreshContainerSize: function () {
            var intNavBottomHeight = this.jGallery.isSlider() ? 0 : this.$container.find( '.nav-bottom' ).outerHeight();
            var isThumbnailsVisible = ! this.jGallery.isSlider() && ! this.thumbnails.getElement().is( '.hidden' );
            var strThumbnailsPosition = isThumbnailsVisible ? this.jGallery.options.thumbnailsPosition : '';

            this.$container.css( {
                'width': isThumbnailsVisible && this.thumbnails.isVertical() ? this.$jGallery.width() - this.thumbnails.getElement().outerWidth( true ) : 'auto',
                'height': isThumbnailsVisible && this.thumbnails.isHorizontal() ? this.$jGallery.height() - this.thumbnails.getElement().outerHeight( true ) - intNavBottomHeight : this.$jGallery.height() - intNavBottomHeight,
                'margin-top': strThumbnailsPosition === 'top' ? this.thumbnails.getElement().outerHeight( true ) : 0,
                'margin-left': strThumbnailsPosition === 'left' ? this.thumbnails.getElement().outerWidth( true ) : 0,
                'margin-right': strThumbnailsPosition === 'right' ? this.thumbnails.getElement().outerWidth( true ) : 0
            } );
            if ( this.jGallery.options.draggableZoom ) {
                this.refreshDragNavCropSize();
            }
        },

        refreshSize: function() {
            if ( this.thumbnails.isFullScreen() ) {
                return;
            }
            this.refreshContainerSize();
            if ( this.jGallery.options.zoomSize === 'original' ) {
                this.original();
            }
            else if ( this.jGallery.options.zoomSize === 'fill' ) {
                this.fill();
            }
            else {
                this.fit();
            }
            this.$element.addClass( 'visible' );
        },

        refreshDragNavCropSize: function() { 
            var $img = this.$element.find( 'img.active' );
            var cropPositionLeft;
            var cropPositionTop;

            this.$dragNavCrop.css( {
                width: this.$element.width() / $img.width() * 100 + '%',
                height: this.$element.height() / $img.height() * 100 + '%'
            } );
            if ( $img.attr( 'data-width' ) < this.$container.outerWidth() ) {
                cropPositionLeft = 0;
            }
            else {
                cropPositionLeft = ( this.$dragNav.width() - this.$dragNavCrop.width() ) / 2;                
            }
            if ( $img.attr( 'data-height' ) < this.$container.outerHeight() ) {
                cropPositionTop = 0;
            }
            else {
                cropPositionTop = ( this.$dragNav.height() - this.$dragNavCrop.height() ) / 2;              
            }
            this.$dragNavCrop.css( {
                left: cropPositionLeft,
                top: cropPositionTop
            } );
            if ( this.$dragNavCropImg.length ) {
                this.$dragNavCropImg.css( {
                    'margin-left': - cropPositionLeft,
                    'margin-top':  - cropPositionTop
                } );
            }
        },

        changeSize: function() {
            if ( this.jGallery.options.zoomSize === 'fit' ) {
                this.jGallery.options.zoomSize = 'fill';
                this.fill();
            }
            else if ( this.jGallery.options.zoomSize === 'fill' ) {
                var $img = this.$element.find( 'img.active' ).eq( 0 );

                if ( this.$element.outerWidth().toString() === $img.attr( 'data-width' ) ) {
                    this.jGallery.options.zoomSize = 'fit';
                    this.fit(); 
                }
                else {        
                    this.jGallery.options.zoomSize = 'original';
                    this.original();         
                }
            }
            else if ( this.jGallery.options.zoomSize === 'original' ) {
                this.jGallery.options.zoomSize = 'fit';
                this.fit();
            }
            this.$container.attr( 'data-size', this.jGallery.options.zoomSize );
        },

        original: function() {
            var $img = this.$element.find( 'img.active' );

            this.advancedAnimation.setPositionParts();
            this.setImgSizeForOriginal( $img );
            this.setImgSizeForOriginal( this.$element.find( '.pt-page.init img' ) );
            if ( $img.attr( 'data-width' ) <= this.$element.outerWidth() && $img.attr( 'data-height' ) <= this.$element.outerHeight() ) {
                this.$resize.addClass( 'fa-search-plus' ).removeClass( 'fa-search-minus' );  
                this.disableDrag();
            }
            else {
                this.$resize.addClass( 'fa-search-minus' ).removeClass( 'fa-search-plus' );
                this.enableDrag();
            }
        },

        fit: function() {
            var $img = this.$element.find( 'img.active' ).add( this.$element.find( '.pt-page.init img' ) );

            this.advancedAnimation.setPositionParts();
            this.setImgSizeForFit( $img.filter( '.active' ) );
            this.setImgSizeForFit( $img.filter( ':not( .active )' ) );
            this.$resize.addClass( 'fa-search-plus' ).removeClass( 'fa-search-minus' );
            this.disableDrag();
        },

        fill: function() {
            var $img = this.$element.find( 'img.active' );

            this.setImgSizeForFill( $img );
            this.setImgSizeForFill( this.$element.find( '.pt-page.init img' ) );
            this.advancedAnimation.setPositionParts();
            if ( $img.attr( 'data-width' ) > $img.width() && $img.attr( 'data-height' ) > $img.height() ) {
                this.$resize.addClass( 'fa-search-plus' ).removeClass( 'fa-search-minus' );                
            }
            else {
                this.$resize.addClass( 'fa-search-minus' ).removeClass( 'fa-search-plus' );
            }
            this.enableDrag();
        },

        setImgSizeForOriginal: function( $img ) {
            $img.css( {
                'width': $img.attr( 'data-width' ),
                'height': $img.attr( 'data-height' ),
                'min-width': 0,
                'min-height': 0,
                'max-width': 'none',
                'max-height': 'none'
            } );       
            $img.css( {
                'margin-top': - $img.height() / 2,
                'margin-left': - $img.width() / 2
            } );            
        },

        setImgSizeForFit: function( $img ) {
            var intNavBottomHeight = this.jGallery.isSlider() ? 0 : this.$container.find( '.nav-bottom' ).outerHeight();
            var isThumbnailsVisible = ! this.jGallery.isSlider() && ! this.thumbnails.getElement().is( '.hidden' );

            $img.css( {
                'width': 'auto',
                'height': 'auto',
                'min-width': 0,
                'min-height': 0,
                'max-width': isThumbnailsVisible && this.thumbnails.isVertical() ? this.$jGallery.width() - this.thumbnails.getElement().outerWidth( true ) : this.$jGallery.width(),
                'max-height': isThumbnailsVisible && this.thumbnails.isHorizontal() ? this.$jGallery.height() - this.thumbnails.getElement().outerHeight( true ) - intNavBottomHeight : this.$jGallery.height() - intNavBottomHeight
            } );   
            if ( $img.width() / $img.height() / this.jGallery.getCanvasRatioWidthToHeight() < 1 ) {
                $img.css( {
                    'width': 'auto',
                    'height': isThumbnailsVisible && this.thumbnails.isHorizontal() ? this.$jGallery.height() - this.thumbnails.getElement().outerHeight( true ) - intNavBottomHeight : this.$jGallery.height() - intNavBottomHeight
                } );                        
            }
            else {
                $img.css( {
                    'width': isThumbnailsVisible && this.thumbnails.isVertical() ? this.$jGallery.width() - this.thumbnails.getElement().outerWidth( true ) : this.$jGallery.width(),
                    'height': 'auto'
                } );
            }             
            $img.css( {
                'margin-top': - $img.height() / 2,
                'margin-left': - $img.width() / 2
            } );
        },

        setImgSizeForFill: function( $img ) {
            var intNavBottomHeight = this.jGallery.isSlider() ? 0 : this.$container.find( '.nav-bottom' ).outerHeight();
            var isThumbnailsVisible = ! this.jGallery.isSlider() && ! this.thumbnails.getElement().is( '.hidden' );

            $img.css( {
                'width': 'auto',
                'height': 'auto',
                'max-width': 'none',
                'max-height': 'none',                    
                'min-width': 0,
                'min-height': 0
            } );
            if ( $img.width() / $img.height() / this.jGallery.getCanvasRatioWidthToHeight() > 1 ) {
                $img.css( {
                    'width': 'auto',
                    'height': isThumbnailsVisible && this.thumbnails.isHorizontal() ? this.$jGallery.height() - this.thumbnails.getElement().outerHeight( true ) - intNavBottomHeight : this.$jGallery.height() - intNavBottomHeight
                } );                        
            }
            else {
                $img.css( {
                    'width': isThumbnailsVisible && this.thumbnails.isVertical() ? this.$jGallery.width() - this.thumbnails.getElement().outerWidth( true ) : this.$jGallery.width(),
                    'height': 'auto'
                } );
            }
            $img.css( {                   
                'min-width': isThumbnailsVisible && this.thumbnails.isVertical() ? this.$jGallery.width() - this.thumbnails.getElement().outerWidth( true ) : this.$jGallery.width(),
                'min-height': isThumbnailsVisible && this.thumbnails.isHorizontal() ? this.$jGallery.height() - this.thumbnails.getElement().outerHeight( true ) - intNavBottomHeight : this.$jGallery.height() - intNavBottomHeight
            } );
            $img.css( {
                'margin-top': - $img.height() / 2,
                'margin-left': - $img.width() / 2
            } );
        },

        isLoaded: function( $a ) {
            return this.$element.find( 'img' ).filter( '[src="' + $a.attr( 'href' ) + '"]' ).length > 0;
        },

        refreshNav: function() {
            var $thumbActive = this.thumbnails.getElement().find( 'div.active a.active' );

            $thumbActive.prev( 'a' ).length === 1 ? this.$btnPrev.add( this.$container.children( '.left' ) ).removeClass( 'hidden' ) : this.$btnPrev.add( this.$container.children( '.left' ) ).addClass( 'hidden' );
            $thumbActive.next( 'a' ).length === 1 ? this.$btnNext.add( this.$container.children( '.right' ) ).removeClass( 'hidden' ) : this.$btnNext.add( this.$container.children( '.right' ) ).addClass( 'hidden' );
            if ( this.$element.is( '.is-link' ) ) {
                this.$container.children( '.left, .right' ).addClass( 'hidden' );
            }
        },

        slideshowStop: function () {
            this.slideshowPause();
            this.jGallery.progress.clear();
        },

        slideshowPause: function () {
            this.jGallery.progress.pause();
            this.$slideshow.removeClass( 'fa-pause' ).addClass( 'fa-play' );
            this.booSlideshowPlayed = false;
            if ( this.jGallery.options.slideshowCanRandom ) {
                this.$random.hide();
            }
        },

        slideshowPlay: function() {
            if ( this.booLoadingInProgress || this.booSlideshowPlayed ) {
                return;
            }
            this.booSlideshowPlayed = true;
            this.$slideshow.removeClass( 'fa-play' ).addClass( 'fa-pause' );
            this.slideshowSetTimeout();
            if ( this.jGallery.options.slideshowCanRandom ) {
                this.$random.show();
            }
        },

        slideshowPlayPause: function() {
            this.$slideshow.is( '.fa-play' ) ? this.slideshowPlay() : this.slideshowPause();
        },

        slideshowSetTimeout: function() {
            var self = this;

            this.jGallery.progress.start( this.$container.width(), function() {
                self.jGallery.progress.clear();
                self.jGallery.options.slideshowRandom ? self.showRandomPhoto() : self.showNextPhotoLoop();
            } );
        },

        slideshowRandomToggle: function() {
            if ( this.jGallery.options.slideshowRandom ) {
                this.$random.removeClass( 'active' );
                this.jGallery.options.slideshowRandom = false;
            }
            else {
                this.$random.addClass( 'active' );
                this.jGallery.options.slideshowRandom = true;                    
            }
        },

        showNextPhotoLoop: function() {
            var $next = this.thumbnails.$a.filter( '.active' ).next( 'a' );

            if ( $next.length === 0 ) {
                $next = this.thumbnails.$albums.filter( '.active' ).find( 'a' ).eq( 0 );
            }
            this.showPhoto( $next );
        },

        showRandomPhoto: function() {
            var $thumbnailsANotActive = this.thumbnails.$albums.filter( '.active' ).find( 'a:not(.active)' );

            this.showPhoto( $thumbnailsANotActive.eq( Math.floor( Math.random() * $thumbnailsANotActive.length ) ) );
        },

        showPrevPhoto: function() {
            var $prev = this.thumbnails.$a.filter( '.active' ).prev( 'a' );
            if ( $prev.length === 1 ) {
                this.showPhoto( $prev );
            } 
        },

        showNextPhoto: function() {
            var $next = this.thumbnails.$a.filter( '.active' ).next( 'a' );
            if ( $next.length === 1 ) {
                this.showPhoto( $next );
            }
        },

        showPhotoInit: function() {
            this.jGallery.init();
        },


        showPhoto: function( $a, options ) {
            var self = this;
            var $imgThumb = $a.children( 'img' );
            var booIsLoaded;
            var albumTitle;
            var transition;
            var transitionName;

            if ( ! this.jGallery.initialized() ) {
                this.showPhotoInit();
            }
            if ( this.booLoadingInProgress ) {
                return;
            }
            this.booLoadingInProgress = true;
            transitionName = this.jGallery.options[ $a.nextAll( '.active' ).length > 0 ? 'transitionBackward' : 'transition' ];
            if ( transitionName === 'random' ) {
                this.setRandomTransition();
            }
            else if ( transitionName === 'auto' ) {
                transition = jGalleryTransitions[ jGalleryBackwardTransitions[ this.jGallery.options[ 'transition' ] ] ];
                this.advancedAnimation.setHideEffect( transition[0] );
                this.advancedAnimation.setShowEffect( transition[1] );
            }
            else {
                transition = jGalleryTransitions[ transitionName ];
                this.advancedAnimation.setHideEffect( transition[0] );
                this.advancedAnimation.setShowEffect( transition[1] );
            }
            this.$element.find( '.pt-page.init' ).remove();
            this.jGallery.options.showPhoto();
            if ( this.jGallery.$element.is( ':not(:visible)' ) ) {
                this.jGallery.show();
            }
            this.thumbnails.changeViewToBar();
            if ( this.jGallery.booIsAlbums ) {
                if ( this.jGallery.iconChangeAlbum.getTitle() === '' ) {
                    albumTitle = $a.parents( '.album' ).eq( 0 ).attr( 'data-jgallery-album-title' );
                    this.jGallery.iconChangeAlbum.setTitle( albumTitle );
                    this.jGallery.iconChangeAlbum.$element.find( '[data-jgallery-album-title="' + albumTitle + '"]' ).addClass( 'active' );
                    $a.parents( '.album' ).addClass( 'active' ).siblings( '.album' ).removeClass( 'active' );
                }
            }
            this.thumbnails.setActiveAlbum( this.thumbnails.$albums.filter( '[data-jgallery-album-title="' + $a.parents( '[data-jgallery-album-title]' ).attr( 'data-jgallery-album-title' ) + '"]' ) );
            this.thumbnails.setActiveThumb( $a );
            if ( this.$element.find( 'img.active' ).attr( 'src' ) === $a.attr( 'href' ) ) {
                this.booLoadingInProgress = false;
                this.setJGalleryColoursForActiveThumb();
                return;
            }
            if ( $a.is( '[link]' ) ) {
                this.$element.addClass( 'is-link' );
                if ( $a.is( '[target="_blank"]') ) {
                    this.$element.attr( 'onclick', 'window.open("' + $a.attr( 'link' ) + '")' );
                }
                else {
                    this.$element.attr( 'onclick', 'window.location="' + $a.attr( 'link' ) + '"' );                    
                }
            }
            else {
                this.$element.removeClass( 'is-link' );
                this.$element.removeAttr( 'onclick' );                
            }
            this.refreshNav();
            if ( this.jGallery.options.title ) {
                this.$title.addClass( 'after fade' );
            }
            booIsLoaded = self.isLoaded( $a );
            if ( ! booIsLoaded ) {
                if ( self.jGallery.options.preloadAll && ! self.booLoadedAll ) {
                    this.appendAllPhotos();
                }
                else {
                    this.appendPhoto( $a );
                }
            }
            this.$element.find( 'img.active' ).addClass( 'prev-img' );
            self.$container.find( 'img.active' ).removeClass( 'active' );
            self.$container.find( '[src="' + $a.attr( 'href' ) + '"]' ).addClass( 'active' );
            if ( self.jGallery.options.title && $imgThumb.is( '[alt]' ) ) {
                self.$title.removeClass( 'after' ).addClass( 'before' );
            }
            if ( ! booIsLoaded || ( self.jGallery.options.preloadAll && ! self.booLoadedAll ) ) {
                self.booLoadedAll = true;
                self.$container.overlay( {'show': true, 'showLoader': true} );
                self.jGallery.options.beforeLoadPhoto();
                self.loadPhoto( self.$element, $a, options );
            }
            else {
                self.showPhotoSuccess( $imgThumb, options );
            }
        },

        appendPhoto: function ( $a ) {
            this.$element.find( '.pt-part' ).append( '\
                <div class="jgallery-container pt-page">\
                    <div class="pt-item"><img src="' + $a.attr( 'href' ) + '" /></div>\
                </div>' );
        },

        appendAllPhotos: function() {       
            var self = this;

            if ( ! this.jGallery.options.preloadAll ) {
                return;
            }                
            this.thumbnails.$a.each( function() {
                var $a = $( this );
                if ( ! self.isLoaded( $a ) ) {
                    self.$element.find( '.pt-part' ).append( '<div class="jgallery-container pt-page"><div class="pt-item"><img src="' + $a.attr( 'href' ) + '" /></div></div>' );
                }
            } );
            this.appendInitPhoto( this.thumbnails.$a.eq( -1 ) );
        },

        appendInitPhoto: function( $a ) {
            if ( $a.length !== 1 ) {
                return;
            }
            this.$element.find( '.pt-part' ).append( '\
                <div class="jgallery-container pt-page pt-page-current pt-page-ontop init" style="visibility: hidden;">\
                    <div class="pt-item"><img src="' + $a.attr( 'href' ) + '" class="active loaded" /></div>\
                </div>' );
        },

        loadPhoto: function( $zoom, $a, options ) {
            var self = this;
            var $imgThumb = $a.children( 'img' );
            var intPercent = 0;
            var $ptPart = $zoom.find( '.pt-part' ).eq( 0 );
            var $toLoading = this.jGallery.options.preloadAll ? $ptPart : $ptPart.find( 'img.active' );

            $toLoading.jLoader( {
                interval: 500,
                skip: '.loaded',
                start: function() {   
                    if ( self.jGallery.options.preloadAll ) {
                        self.$container.find( '.overlay .imageLoaderPositionAbsolute:not(:has(.progress-value))' ).addClass( 'preloadAll' )
                            .append( '<span class="progress-value"></span>' );
                        self.$container.find( '.progress-value' ).html( '0' );
                    }
                    else {
                        self.$container.find( '.overlay .imageLoaderPositionAbsolute:not(:has(.fa-spin))' )
                            .append( '<span class="fa fa-spin fa-spinner"></span>' );                            
                    }
                },
                success: function() {
                    $zoom.find( 'img' ).addClass( 'loaded' );
                    self.$container.overlay( {'hide': true, 'hideLoader': true} );
                    self.showPhotoSuccess( $imgThumb, options );
                },
                progress: function( data ) {
                    if ( ! self.jGallery.options.preloadAll ) {
                        return;
                    }
                    intPercent = data.percent;
                    self.$container.find( '.overlay .imageLoaderPositionAbsolute' ).find( '.progress-value' ).html( intPercent );
                }
            } );
        },

        showPhotoSuccess: function( $imgThumb, options ) {
            var image;
            var $active = this.$element.find( 'img.active' );

            options = $.extend( {}, {
                historyPushState: true
            }, options );            
            if ( $active.is( ':not([data-width])' ) ) {
                image = new Image();
                image.src = $active.attr( 'src' );
                $active.attr( 'data-width', image.width );
                $active.attr( 'data-height', image.height );
            }
            if ( this.jGallery.options.title && $imgThumb.attr( 'alt' ) ) {
                this.$title.html( $imgThumb.attr( 'alt' ) ).removeClass( 'before' ).removeClass( 'after' );
                this.jGallery.$element.addClass( 'has-title' );
            }
            else {
                this.jGallery.$element.removeClass( 'has-title' );
            }
            this.setJGalleryColoursForActiveThumb();
            this.$element.find( '.pt-page.init' ).css( {
                visibility: 'visible'
            } );
            this.$element.find( 'img.prev-img' ).removeClass( 'prev-img' );
            this.advancedAnimation.show( $active.eq( 0 ).parent().parent(), {
                animation: this.$element.find( '.pt-part' ).eq( 0 ).find( '.pt-page-current:not(.pt-page-prev)' ).length === 1
            } );
            this.refreshSize();
            this.thumbnails.refreshNavigation();
            if ( this.booSlideshowPlayed ) {
                this.slideshowSetTimeout();
            }
            this.jGallery.options.afterLoadPhoto();
            this.booLoadingInProgress = false;
            if ( this.jGallery.options.autostart && this.jGallery.options.slideshowAutostart && this.jGallery.options.slideshow ) {
                this.jGallery.options.slideshowAutostart = false;
                this.slideshowPlay();
            }
            if ( this.jGallery.options.draggableZoom ) {
                this.$dragNav.html( '<img src="' + $active.attr( 'src' ) + '" class="bg">\
                    <div class="crop"><img src="' + $active.attr( 'src' ) + '"></div>' );
                this.$dragNavCrop = this.$dragNav.find( '.crop' );
                this.$dragNavCropImg = this.$dragNavCrop.find( 'img' );   
                this.refreshDragNavCropSize();
            }
            if ( options.historyPushState && this.jGallery.options.browserHistory ) {
                historyPushState( {
                    path: $active.attr( 'src' )
                } );
            }
        },

        showPhotoByPath: function( path ) {
            var $a = this.thumbnails.$albums.filter( '.active' ).find( 'a[href="' + path + '"]' );

            if ( $a.length === 0 ) {
                $a = this.thumbnails.$a.filter( 'a[href="' + path + '"]' ).eq( 0 );
            }
            if ( $a.length === 0 ) {
                return;
            }
            this.showPhoto( $a, {
                historyPushState: false
            } );
        },

        setJGalleryColoursForActiveThumb: function() {
            var $imgThumb = this.thumbnails.$a.filter( '.active' ).find( 'img' );

            this.jGallery.setColours( {
                strBg: $imgThumb.is( '[data-jgallery-bg-color]' ) ? $imgThumb.attr( 'data-jgallery-bg-color' ) : this.jGallery.options.backgroundColor,
                strText: $imgThumb.is( '[data-jgallery-bg-color]' ) ? $imgThumb.attr( 'data-jgallery-text-color' ) : this.jGallery.options.textColor
            } );
        },

        setTransition: function( transition ) {
            this.jGallery.options.hideEffect = jGalleryTransitions[ transition ][ 0 ];
            this.jGallery.options.showEffect = jGalleryTransitions[ transition ][ 1 ];
            this.advancedAnimation.setHideEffect( this.jGallery.options.hideEffect );
            this.advancedAnimation.setShowEffect( this.jGallery.options.showEffect );    
        },

        setRandomTransition: function() {
            var rand;

            this.$element.find( '.pt-page' )
                .removeClass( this.jGallery.options.hideEffect )
                .removeClass( this.jGallery.options.showEffect );
            rand = Math.floor( ( Math.random() * jGalleryArrayTransitions.length ) );
            this.jGallery.options.hideEffect = jGalleryArrayTransitions[ rand ][ 0 ];
            this.jGallery.options.showEffect = jGalleryArrayTransitions[ rand ][ 1 ];
            this.advancedAnimation.setHideEffect( this.jGallery.options.hideEffect );
            this.advancedAnimation.setShowEffect( this.jGallery.options.showEffect ); 
        },

        unmarkActive: function() {
            this.$element.find( 'img.active' ).removeClass( 'active' );
        },

        changeMode: function() {
            var currentMode = this.jGallery.options.mode;

            if ( currentMode === 'slider' ) {
                return;
            }
            if ( currentMode === 'standard' ) {
                this.goToFullScreenMode();
            }
            else if ( currentMode === 'full-screen' ) {
                this.goToStandardMode();
            }
            if ( this.jGallery.iconChangeAlbum instanceof IconChangeAlbum ) {
                this.jGallery.iconChangeAlbum.refreshMenuHeight();
            }
        },

        goToFullScreenMode: function() {
            $body.css( {
                overflow: 'hidden'
            } );
            this.jGallery.$this.show();
            this.jGallery.$element.removeClass( 'jgallery-standard' ).addClass( 'jgallery-full-screen' ).css( {
                width: 'auto',
                height: 'auto'
            } );
            this.$changeMode.removeClass( 'fa-expand' ).addClass( 'fa-compress' );
            this.jGallery.options.mode = 'full-screen';
            this.jGallery.refreshDimensions();
        },

        goToStandardMode: function() {
            $body.css( {
                overflow: 'visible'
            } );
            this.jGallery.$this.hide();
            this.jGallery.$element.removeClass( 'jgallery-full-screen' ).addClass( 'jgallery-standard' ).css( {
                width: this.jGallery.options.width,
                height: this.jGallery.options.height
            } );
            this.$changeMode.removeClass( 'fa-compress' ).addClass( 'fa-expand' );
            this.jGallery.options.mode = 'standard';
            this.jGallery.refreshDimensions();
        }
    };
    
    return Zoom;
} )( jLoader, overlay, historyPushState, jGalleryTransitions, jGalleryArrayTransitions, jGalleryBackwardTransitions, AdvancedAnimation, IconChangeAlbum );