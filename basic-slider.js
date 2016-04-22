(function(window, document) {
  "use strict"

  /**
   * Fairly basic slider
   * @param {DOM element} element Element to contain slider, include .slides and .slide inside
   * @param {Object} options
   *
   */
  var BasicSlider = function(element, options) {
    this.element = element;
    this.slidesElement = element.querySelector('.slides');
    this.slides = [];
    this.nSlides = 0;
    this.nClones = 0;
    this.lastSlide = 0;
    this.currentSlide;
    this.loops;

    options = options || {};
    this.options = options;
    this.options.effect = options.effect || parseInt(this.element.getAttribute('data-effect')) || 'slide';
    this.options.effectDuration = options.effectDuration || parseInt(this.element.getAttribute('data-effect-duration')) || 1000;
    this.options.center = options.center || parseInt(this.element.getAttribute('data-center')) || false;
    this.options.margin = options.margin || parseInt(this.element.getAttribute('data-margin')) || 0;
    this.options.setHeight = options.setHeight || parseInt(this.element.getAttribute('data-set-height')) || 0;
    this.options.slidesVisible = options.slidesVisible || parseInt(this.element.getAttribute('data-slides-visible')) || 1;
    this.options.throttleControls = options.throttleControls || parseInt(this.element.getAttribute('data-throttle-controls')) || false;
    this.options.slideNav = options.slideNav || parseInt(this.element.getAttribute('data-slide-nav')) || false;
    this.options.directionNav = options.directionNav || null;
    this.options.controlNav = options.controlNav || null;
    this.options.afterInit = options.afterInit || function() {};
    this.options.afterSlide = options.afterSlide || function() {};
    this.options.beforePrev = options.beforePrev || function() {};
    this.options.afterPrev = options.afterPrev || function() {};
    this.options.beforeNext = options.beforeNext || function() {};
    this.options.afterNext = options.afterNext || function() {};

    // Width is being auto detected based on style
    this.autoWidth = this.options.slidesVisible === 'auto';

    this.init();

    this.directionNav;
    this.prev;
    this.next;

    this.clickable = true;

    window.addEventListener('resize', this.onResize.bind(this));
  }

  BasicSlider.prototype.init = function() {
    var slideNodes = this.element.querySelectorAll(".slide");
    for (var i = 0; i < slideNodes.length; i++) {
      this.slides[i] = slideNodes[i];
    };

    // Clone slides for infinite loop
    this.nOriginalSlides = this.slides.length;
    if(this.options.effect === "slide") {
      this.loops = true;
      this.cloneSlides();
    } else {
      this.loops = false;
      this.nClones = 0;
    }
    this.nSlides = this.slides.length;

    var activeNodeAt = null;
    for (var i = 0; i < this.nSlides; i++) {
      this.slides[i].setAttribute("data-slide", i);

      if(this.slides[i].getAttribute("data-state") === "active") {
        activeNodeAt = i;
      }
    };

    this.element.style.position = "relative";
    this.element.style.overflow = "hidden";

    if(this.options.carousel) {
      this.setupCarousel();
    } else {
      this.setupSlider();
    }

    this.setupNav();

    // afterInit callback
    this.options.afterInit.call(this);

    this.currentSlide = activeNodeAt ? activeNodeAt : this.nClones;
    this.moveToSlide(this.currentSlide, true, true);
  }

  BasicSlider.prototype.unset = function() {
    this.element.removeAttribute('style');
    this.slidesElement.removeAttribute('style');
    [].forEach.call(this.slidesElement.querySelectorAll('.slide'), function(s) {
      s.classList.remove('active-slide');
      s.removeAttribute('style');
    });
    if(this.directionNav) this.directionNav.innerHTML = "";
    if(this.controlNav) this.controlNav.innerHTML = "";
  }

  BasicSlider.prototype.cloneSlides = function() {
    this.originalSlides = this.slides;

    // Determine number of slides to clone
    // Right now whole screen in case goes to end
    if(this.autoWidth || this.options.slidesVisible > 1) {
      var slidesVisible = this.slides.length
    } else {
      var slidesVisible = this.options.slidesVisible;
    }

    this.nClones = slidesVisible;

    var firstSlides = [];
    var lastSlides = [];

    // Create clones
    for (var i = 0; i < this.nClones; i++) {
      firstSlides[i] = this.slides[this.slides.length - (i + 1)].cloneNode(true);
      lastSlides[i] = this.slides[i].cloneNode(true);

      firstSlides[i].classList.add('clone');
      lastSlides[i].classList.add('clone');
      firstSlides[i].removeAttribute('data-state');
      lastSlides[i].removeAttribute('data-state');
    };

    // Insert clones
    for (var i = 0; i < this.nClones; i++) {
      this.slidesElement.insertBefore(firstSlides[i], this.slidesElement.children[0]);
      this.slides.unshift(firstSlides[i]);

      this.slidesElement.appendChild(lastSlides[i]);
      this.slides.push(lastSlides[i]);
    };
  }

  BasicSlider.prototype.setupSlider = function() {

    this.slidesElement.style.padding = "0";
    this.slidesElement.style.margin = "0";
    for (var i = 0; i < this.nSlides; i++) {
      this.slides[i].style['-webkit-touch-callout'] = 'none';
      this.slides[i].style['-webkit-user-select'] = 'none';
      this.slides[i].style['-khtml-user-select'] = 'none';
      this.slides[i].style['-moz-user-select'] = 'none';
      this.slides[i].style['-ms-user-select'] = 'none';
      this.slides[i].style['user-select'] = 'none';
    }

    if(this.autoWidth) {
      this.setSize();
      BasicSlider.applyPrefixedStyle(this.slidesElement, 'transition', 'transform 0.8s');
    } else {
      // Set slides element width/transition
      var baseWidth = 100 / this.options.slidesVisible;
      this.slidesElement.style.width = ((baseWidth + this.options.margin) * this.nSlides) + "%";
      BasicSlider.applyPrefixedStyle(this.slidesElement, 'transition', 'transform 0.8s');

      // Set individual slide widths/styles
      for (var i = 0; i < this.nSlides; i++) {
        this.slides[i].style.float = "left";
        var margin = this.options.margin / 2 / this.nSlides;
        var widthFactor = 1 / ((100 + this.options.margin) / 100);
        var marginFactored = margin * widthFactor
        this.slides[i].style.marginLeft = marginFactored + "%";
        this.slides[i].style.marginRight = marginFactored + "%";
        this.slides[i].style.width = (widthFactor * 100 / this.nSlides) + "%";
      };
    }
  }

  BasicSlider.prototype.setupNav = function() {
    // Direction nav
    this.setupDirectionNav();

    // Control Nav
    this.setupControlNav();

    // Swipe
    this.detectSwipe();

    // Click on slide
    if(this.options.slideNav) {
      for (var i = 0; i < this.slides.length; i++) {
        var self = this;
        this.slides[i].addEventListener('click', function() {
          self.moveToSlide(parseInt(this.getAttribute('data-slide')));
        });
      };
    }
  }

  BasicSlider.prototype.setupDirectionNav = function() {
    // Use options direction nav element or find contained element
    if(this.options.directionNav) {
      this.directionNav = this.options.directionNav;
    } else {
      this.directionNav = this.element.querySelector('.direction-nav');
    }
    if(!this.directionNav) return false;
    this.directionNav.style.zIndex = 5;

    // Add prev/next button if not there
    var possiblePrev = this.directionNav.querySelector('.js-slider-prev');
    if(possiblePrev) {
      this.prev = possiblePrev
    } else {
      this.prev = document.createElement('div');
      this.prev.className = 'js-slider-prev';
      this.directionNav.appendChild(this.prev);
    }

    var possibleNext = this.directionNav.querySelector('.js-slider-next');
    if(possibleNext) {
      this.next = possibleNext
    } else {
      this.next = document.createElement('div');
      this.next.className = 'js-slider-next';
      this.directionNav.appendChild(this.next);
    }

    BasicSlider.applyPrefixedStyle(this.prev, 'user-select', 'none');
    this.prev.style.cursor = "pointer";
    this.prev.addEventListener('click', this.handlePrev = this.handlePrev.bind(this));

    BasicSlider.applyPrefixedStyle(this.next, 'user-select', 'none');
    this.next.style.cursor = "pointer";
    this.next.addEventListener('click', this.handleNext = this.handleNext.bind(this));
  }

  BasicSlider.prototype.setupControlNav = function() {
    // Use options direction nav element or find contained element
    if(this.options.controlNav) {
      this.controlNav = this.options.controlNav;
    } else {
      this.controlNav = this.element.querySelector('.control-nav');
    }
    if(!this.controlNav) return false;
    this.controlNav.style.zIndex = 5;

    // Generate dots
    this.controlNav.dots = [];
    for (var i = 0; i < this.nOriginalSlides; i++) {
      var dot = document.createElement('div');
      dot.className = 'js-slider-control dot';
      dot.setAttribute('data-index', i);
      BasicSlider.applyPrefixedStyle(dot, 'user-select', 'none');

      var self = this;
      dot.addEventListener('click', function() { self.moveToSlide(parseInt(this.getAttribute('data-index')) + self.nClones); });

      this.controlNav.appendChild(dot);
      this.controlNav.dots[i] = dot; // EASY ACCESS
    };
  }

  BasicSlider.prototype.getSlideWidth = function() {
    // For now only check first
    return 100 / this.nSlides;
  }

  BasicSlider.prototype.getPrevSlide = function() {
    return this.currentSlide === 0 ? this.nSlides - 1 : this.currentSlide - 1;
  }

  BasicSlider.prototype.getNextSlide = function() {
    return this.currentSlide === this.nSlides - 1 ? 0 : this.currentSlide + 1;
  }

  BasicSlider.prototype.getCurrentSlide = function() {
    if(this.currentSlide === 0) {
      return this.nSlides - 1;
    } else if(this.currentSlide === this.nSlides - 1) {
      return 0;
    } else {
      return this.currentSlide;
    }
  }

  BasicSlider.prototype.prevSlide = function() {
    var prevSlide = this.getPrevSlide()
    this.options.beforePrev.call(this, this.slides[prevSlide], prevSlide);
    this.moveToSlide(prevSlide);
    this.options.afterPrev.call(this, this.slides[prevSlide], prevSlide);
  }

  BasicSlider.prototype.nextSlide = function() {
    var nextSlide = this.getNextSlide()
    this.options.beforeNext.call(this, this.slides[nextSlide], nextSlide);
    this.moveToSlide(nextSlide);
    this.options.afterPrev.call(this, this.slides[nextSlide], nextSlide);
  }

  BasicSlider.prototype.moveToSlide = function(slideNumber, noAnimate, noClip) {
    // Throttle
    if(this.options.throttleControls) {
      if(!this.throttled) {
        this.throttled = true;
        setTimeout(function(){
          this.throttled = false;
        }.bind(this), this.options.effectDuration);
      } else {
        return false;
      }
    }

    slideNumber = parseInt(slideNumber);
    this.currentSlide = slideNumber;

    var position = this.getPosition();

    // Set/remove active class on slides
    [].forEach.call(this.slidesElement.querySelectorAll('.active-slide'), function(s) {
      s.classList.remove('active-slide');
    });
    this.slides[slideNumber].classList.add('active-slide');

    // Clip if looping slider and not prevented in this function
    if(this.loops && !noClip) {
      var slideNumberSafe = this.clip(slideNumber);
    } else {
      var slideNumberSafe = slideNumber - this.nClones;
    }

    // Set controls
    if(this.controlNav) {
      for (var i = 0; i < this.controlNav.dots.length; i++) {
        this.controlNav.dots[i].classList.remove('active');
        this.controlNav.dots[slideNumberSafe].classList.add('active');
      };
    }

    // Set text
    if(this.element.querySelector('.accompaniment')) {
      [].forEach.call(this.element.querySelectorAll('.accompaniment li.active'), function(li) {
        li.classList.remove('active');
      });
      this.element.querySelector('.accompaniment li:nth-child(' + (slideNumberSafe + 1) + ')').classList.add('active');
    }

    if(noAnimate) {
      this.setPositionNoAnimation(position);
    } else {
      this.setPosition(position);
    }

    // onChangeSlide callback
    this.options.afterSlide.call(this, this.slides[slideNumber], slideNumber);
  }

  BasicSlider.prototype.getPosition = function() {
    var activeSlide = (this.currentSlide - Math.floor(this.nSlides / 2));

    if(this.options.effect === "none") {

      return "";

    } else if(this.options.effect === "fade") {

      return "";

    } else {

      if(0 && this.options.slidesVisible === 1) {
        // Percentage-based slide position
        // var negativeOffset = -((this.nSlides - 1) * 10);
        // var widthFactor = 1 / ((100 + this.options.margin) / 100);
        // var leftMargin = (widthFactor * this.options.margin / 10);

        // var slideWidth = this.getSlideWidth();
        // var x =  negativeOffset - leftMargin - activeSlide * slideWidth;
        // return "rotateY(0deg) translateX(" + x + "%)";
      } else {
        // Calculated carousel offset
        var x = -1 * this.slides[this.currentSlide].offsetLeft;

        // Centre carousel active item
        if(this.options.center) {
          x += this.element.clientWidth / 2 - this.slides[this.currentSlide].clientWidth / 2;
        }

        // Append 3D acceleration
        var extraCSS = BasicSlider.hasTransitions() ? 'rotateY(0deg) ' : '';
        // return CSS Position string
        return extraCSS + 'translateX(' + x + 'px)';
      }

    }
  }

  BasicSlider.prototype.setPosition = function(position) {
    BasicSlider.applyPrefixedStyle(this.slidesElement, 'transform', position);
  }

  BasicSlider.prototype.setPositionNoAnimation = function(position) {
    BasicSlider.applyPrefixedStyle(this.slidesElement, 'transition', 'transform 0s');
    BasicSlider.applyPrefixedStyle(this.slidesElement, 'transform', position);
    this.slidesElement.offsetTop
    BasicSlider.applyPrefixedStyle(this.slidesElement, 'transition', 'transform ' + (this.options.effectDuration / 1000) + 's');
  }

  // Move end-to-end for infinite loop effect
  // Returns resulting slide (although both ends still have an active slide)
  BasicSlider.prototype.clip = function(slideNumber) {
    var self = this;
    var slideNumberSafe = slideNumber - this.nClones; // Slide number if there weren't extra padding slides

    var setClipPosition = function(slideNumber) {
      this.clickable = false;

      // Add active class to psuedo-slide
      this.slides[slideNumber].classList.add('active-slide');

      setTimeout(function(){
        this.clickable = true;
        this.currentSlide = slideNumber;
        this.setPositionNoAnimation.call(self, this.getPosition());
      }.bind(this), 1000);
    }.bind(this);

    // Reset to start if at end
    if(this.isCloneAfter(slideNumberSafe)) {
      if(this.autoWidth) {
        var overshoot = slideNumberSafe - this.nClones;
        slideNumberSafe = overshoot;
        slideNumber = this.nClones + overshoot;
      } else {
        slideNumberSafe = 0;
        slideNumber = this.nClones;
      }

      setClipPosition(slideNumber);
    }

    // Reset to end if at start
    if(this.isCloneBefore(slideNumberSafe)) {
      if(this.autoWidth || this.options.slidesVisible > 1) {
        var overshoot = slideNumberSafe;
        slideNumberSafe = this.nClones + overshoot;
        slideNumber = this.nClones + slideNumberSafe;
      } else {
        slideNumberSafe = this.nOriginalSlides - 1;
        slideNumber = this.nOriginalSlides;
      }
      setClipPosition(slideNumber);
    }

    return slideNumberSafe;
  }

  BasicSlider.prototype.isCloneBefore = function(slideNumberSafe) {
    return slideNumberSafe < 0;
  }

  BasicSlider.prototype.isCloneAfter = function(slideNumberSafe) {
    if(this.autoWidth) {
      return slideNumberSafe >= this.nClones;
    } else {
      return slideNumberSafe >= this.nOriginalSlides;
    }
  }

  BasicSlider.prototype.setSize = function(setPosition) {
    if(setPosition) {
      this.setPositionNoAnimation(this.getPosition());
    }

    if(this.autoWidth) {
      this.slidesWidth = this.slides.reduce(function(prev, cur) { return prev + cur.clientWidth; }, 0);
      this.slidesElement.style.width = 3 * this.slidesWidth + "px";
    }

    if(this.options.setHeight) {
      var tallest = 0;
      for (var i = 0; i < this.slides.length; i++) {
        var height = this.slides[i].clientHeight
        if(height > tallest) {
          tallest = height;
        }
      };
      this.slidesElement.style.height = tallest + "px";
    }
  }

  BasicSlider.prototype.onResize = function() {
    this.setSize(true);
    this.moveToSlide(this.currentSlide, true);
  }

  BasicSlider.prototype.handlePrev = function(e) {
    if(this.clickable) {
      this.prevSlide();
    }
  }

  BasicSlider.prototype.handleNext = function(e) {
    if(this.clickable) {
      this.nextSlide();
    }
  }

  BasicSlider.prototype.detectSwipe = function() {
    var self = this;
    var minimumSwipeDistance = 30;

    this.element.addEventListener('touchstart', function(e) {
      var clientX = e.touches ? e.touches[0].pageX : e.clientX;
      var clientY = e.touches ? e.touches[0].pageY : e.clientY;

      // Store the initial position of drag event relative to viewport
      self.touchData = {};
      self.touchData.touchstartClientX = clientX;
      self.touchData.touchstartClientY = clientY;
    });

    this.element.addEventListener('touchend', function (e) {
      var clientX = e.touches ? e.changedTouches[0].pageX : e.clientX;
      var clientY = e.touches ? e.changedTouches[0].pageY : e.clientY;

      var xVector = self.touchData.touchstartClientX - clientX;
      var yVector = self.touchData.touchstartClientY - clientY;
      var absXVector = Math.abs(xVector);
      var absYVector = Math.abs(yVector);

      // Must have moved more horizontally than vertically
      if(absXVector > absYVector && absXVector > minimumSwipeDistance) {
        var direction = xVector > 0 ? "left" : "right";
        direction === "left" ? self.nextSlide() : self.prevSlide();
      }
    });
  }

  BasicSlider.applyPrefixedStyle = function(element, style, value) {
    var getCSSPrefix = function(style, value) {
      return ' -webkit- -moz- -o- -ms-'.split(' ').map(function(prefix) { return prefix + style; });
    }
    var prefixes = getCSSPrefix(style, value);

    prefixes.forEach(function(prefix) {
      element.style[prefix] = value;
    });
  }

  BasicSlider.hasTransitions = function() {
    var prefixes = 'transition WebkitTransition MozTransition OTransition msTransition'.split(' ');
    var div = document.createElement('div');
    for(var i = 0; i < prefixes.length; i++) {
      if(div && div.style[prefixes[i]] !== undefined) {
        return prefixes[i];
      }
    }
    return false;
  };

  var sliders = document.querySelectorAll('.js-slider');
  for (var i = 0; i < sliders.length; i++) {
    var jsSlider = new BasicSlider(sliders[i], {});
  }

  window.BasicSlider = BasicSlider;


})(window, document);
