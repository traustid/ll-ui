var appLanguage = 'is';

var PlaceInfo = Backbone.Model.extend({
	defaults: {
		id: 0,
		name: '',
		coordinates: []
	}
});

var StoryInfo = Backbone.Model.extend({
	defaults: {
		id: 0,
		title: '',
		type: -1,
		places: [],
		text: ''
	},

	getContent: function() {
		var _this = this;
		$.ajax('data/stories/'+this.get('id')+'.html', {
			complete: function(response, status) {
				if (status == 'success') {			
					_this.set('html', response.responseText ? response.responseText : '');
				}
				_this.trigger('fetchComplete');
			},

		});
	}
});

var StoryType = Backbone.Model.extend({
	defaults: {
		id: 0,
		name: ''
	}
});

var PlaceList = Backbone.Collection.extend({
	model: PlaceInfo,
	url: 'data/places.json',

	initialize: function() {
		this.fetch();
	},

	getPopulated: function() {
		filtered = this.filter(function(place) {
			var byPlace = app.storiesList.byPlace(place.get('id'));
			return byPlace.length > 0;
		});
		return new PlaceList(filtered);
	},

	byType: function(type) {
		filtered = this.filter(function(place) {
			var byPlace = app.storiesList.byPlace(place.get('id'));
			var hasType = false;
			_.each(byPlace.models, function(story) {
				if (story.get('type') == type) {
					hasType = true;
				}
			});
			return hasType;
		});
		return new PlaceList(filtered);
	},

	fetch: function(options) {
		options = (options == undefined ? {}: options);
		options.reset = true;
		return Backbone.Collection.prototype.fetch.call(this, options);
	},

	parse: function(response) {
		return response.places;
	}
});

var MapCollection = Backbone.Collection.extend({
	model: PlaceInfo
});

var StoriesList = Backbone.Collection.extend({
	model: StoryInfo,
	currentList: 'stories',

	initialize: function() {
	},

	byPlace: function(place) {
		filtered = this.filter(function(story) {
			return story.get("places").indexOf(place) > -1;
		});
		return new StoriesList(filtered);
	},

	fetch: function(options) {
		options = (options == undefined ? {}: options);
		options.reset = true;
		return Backbone.Collection.prototype.fetch.call(this, options);
	},

	parse: function(response) {
		if (response.intro != undefined) {
			this.intro = response.intro;
		}
		else {
			this.intro = undefined;
		}

		return response.data;
	},

	dataUrls: {
		stories: {
			is: 'data/stories.json',
			en: 'data/stories-en.json'
		},
		sturlunga: {
			is: 'data/sturlunga.json',
			en: 'data/sturlunga-en.json'
		},
		services: {
			is: 'data/services.json',
			en: 'data/services.json'
		},
		hiking: {
			is: 'data/hiking.json',
			en: 'data/hiking.json'
		}
	},

	loadData: function(dataList, success) {
		this.currentList = dataList;
		this.url = this.dataUrls[dataList][window.appLanguage];
		this.fetch({
			success: success
		});
	}
});

var Types = Backbone.Collection.extend({
	model: StoryType,
	url: 'data/types.json',

	initialize: function() {
		this.fetch();
	},

	fetch: function(options) {
		options = (options == undefined ? {}: options);
		options.reset = true;
		return Backbone.Collection.prototype.fetch.call(this, options);
	},

	parse: function(response) {
		return response.types;
	}
});

var StoryTypesView = Backbone.View.extend({
	initialize: function() {
		this.listenTo(this.collection, 'reset', this.render);
	},

	render: function() {
		var template = _.template($('#storyTypesTemplate').html(), {
			types: this.collection.filter(function(model) {
				return model.get('category') == 'stories';
			})
		});
		$(this.el).html(template);
		this.trigger('render');

		return this;
	}
});

var StoryView = Backbone.View.extend({
	initialize: function() {
		this.on('render', function() {
			this.$('.content').css('top', this.$('.header').height()+20);
		});
	},

	viewStory: function(story) {
		if (this.model != story) {
			this.model = story;
			this.model.on('fetchComplete', _.bind(function() {
				this.render();
			}, this));
			this.model.getContent();
		}
	},

	viewAudio: function() {
		this.$('.content.text').removeClass('visible');
		this.$('.content.audio').addClass('visible');
		this.trigger('viewAudio');
	},

	viewText: function() {
		this.$('.content.text').addClass('visible');
		this.$('.content.audio').removeClass('visible');
		this.trigger('viewText');
	},

	events: {
		'click .header h2': function(event) {
			this.trigger('headerClick');
		},
		'click .share a.button': function(event) {
			window.plugins.socialsharing.share(this.model.get('title'), null, null, 'http://lifandilandslag.is/#place/'+this.model.get('place')+'/story/'+this.model.get('id'));
		},
		'click .audio-play-button': function(event) {
			this.trigger('playClick');
		},
		'click .audio-position': function(event) {
			var posX = event.offsetX;
			var controlWidth = this.$('.audio-position').width();
			var seek = posX / controlWidth;

			this.trigger('audioSeek', seek);
			this.audio.seekTo((this.audio.getDuration()*1000)*seek);
		},
		'click .info .item.url a': function(event) {
			if (navigator.app && navigator.app.loadUrl) {
				event.preventDefault();
				window.open(event.target.href, '_system');
//				navigator.app.loadUrl(event.target.href, {openExternal:true})
			}
		},
		'click .extra-chapter h3': function(event) {
			var _this = this;

			var currentTarget = $(event.currentTarget);

			currentTarget.closest('.content.text').find('.chapter-content').slideUp(500);
			currentTarget.closest('.content.text').find('.main-chapter').slideUp(500);
			currentTarget.next('.chapter-content').slideDown(500);

			$('.extra-chapter').removeClass('selected');
			currentTarget.parent().addClass('selected');

			_this.$el.find('.chapter-intro-link').slideDown();

			setTimeout(function() {
				_this.$el.find('.content.text').animate({
					scrollTop: 0
				});
			}, 600);
		},
		'click .chapter-intro-link': function(event) {
			var _this = this;

			var currentTarget = $(event.currentTarget);

			_this.$el.find('.chapter-link').slideUp(500);
			currentTarget.closest('.content.text').find('.main-chapter').slideDown(500);
			_this.$el.find('.chapter-content').slideUp(500);

			_this.$el.find('.chapter-intro-link').slideUp(500);

			$('.extra-chapter').removeClass('selected');

			_this.$el.find('.content.text').animate({
				scrollTop: 0
			});
		}
	},

	render: function() {
		var template = _.template($("#storyViewTemplate").html(), {
			model: this.model
		});
		$(this.el).html(template);

		$(this.el).find('.extra-chapter .chapter-content').hide();

		if ($(this.el).find('.extra-chapter').length > 0) {
			$(this.el).find('.main-chapter').after('<h3 class="chapter-intro-link">Inngangur</h3>');
			$(this.el).find('.chapter-intro-link').hide();
		}

		this.trigger('render');

		return this;
	}
});

var PlaceView = Backbone.View.extend({
	initialize: function() {
		_.bindAll(this, "render");
		this.listenTo(this.model, 'change:placeName', this.render);
	},

	events: {
		'click .header h2': function(event) {
			this.trigger('headerClick');
		},
		'click .stories-list li a': function(event) {
			this.trigger('itemClick', {
				storyId: $(event.target).attr('data-story'),
				placeId: $(event.target).attr('data-place')
			});
		}
	},

	render: function() {
		var template = _.template($("#placeViewTemplate").html(), {
			placeName: this.model.get('placeName'),
			placeId: this.model.get('placeId'),
			stories: this.model.get('stories')
		});
		$(this.el).html(template);
		this.trigger('render');

		return this;
	}

});

var SoundManager = Backbone.Model.extend({
	defaults: {
		soundId: -1
	},

	audioRoot: 'http://lifandilandslag.is/audio/',

	media: null,
	mediaStatus: -1,
	audioMonitor: null,
	audioMonitorCallback: null,

	loadSound: function(soundId, autoPlay) {
		if (this.media != null) {
			this.destroySound();
		}
		var _this = this;
		this.set('soundId', soundId);

		if (!hasAudio()) {
			this.media = new Media(this.audioRoot+this.get('soundId')+'.mp3',
				function() {
				},
				function(error) {
					console.log(error);
				},
				function(status) {
					_this.mediaStatus = status;
					_this.trigger('mediaStatus');
				}
			);
		}
		else {
			this.media = new Audio(this.audioRoot+this.get('soundId')+'.mp3');
			this.media.addEventListener('canplay', function(event) {
				_this.mediaStatus = 2;
				_this.trigger('mediaStatus');
			});
		}

		if (autoPlay) {
			this.play();
		}
		this.trigger('loadSound');			
	},

	play: function() {
		if (this.media != null) {
			if (!hasAudio()) {
				this.media.play({
					numberOfLoops: 1
				})
			}
			else {
	 			this.media.play();
			}
			this.startAudioMonitor();

			if (!!hasAudio()) {
				this.mediaStatus = 2;
				this.trigger('mediaStatus');
			}
		}
	},

	pause: function() {
		if (this.media != null) {
			this.media.pause();
			this.stopAudioMonitor();

			if (!!hasAudio()) {
				this.mediaStatus = 3;
				this.trigger('mediaStatus');
			}
		}
	},

	destroySound: function() {
		if (!hasAudio()) {
			this.media.stop();
			this.media.release();
		}
		else {
			this.media.pause();
		}
		this.media = null;
		this.stopAudioMonitor();
	},

	startAudioMonitor: function() {
		var _this = this;
		if (this.media != null) {

			this.audioMonitor = setInterval(function() {
				if (!hasAudio()) {
					if (_this.media.getDuration() > -1) {
						_this.media.getCurrentPosition(function(position) {
							var posMinutes = Math.floor(position / 60);
							var posSeconds = position - posMinutes * 60;

							var durMinutes = Math.floor((_this.media.getDuration()) / 60);
							var durSeconds = (_this.media.getDuration()) - durMinutes * 60;

							_this.trigger('audioMonitor', {
								position: position,
								duration: _this.media.getDuration(),
								posMinutes: posMinutes,
								posSeconds: posSeconds,
								durMinutes: durMinutes,
								durSeconds: durSeconds
							});
						});
					}
				}
				else {
					var posMinutes = Math.floor(_this.media.currentTime / 60);
					var posSeconds = _this.media.currentTime - posMinutes * 60;

					var durMinutes = Math.floor((_this.media.duration) / 60);
					var durSeconds = (_this.media.duration) - durMinutes * 60;

					_this.trigger('audioMonitor', {
						position: _this.media.currentTime,
						duration: _this.media.duration,
						posMinutes: posMinutes,
						posSeconds: posSeconds,
						durMinutes: durMinutes,
						durSeconds: durSeconds
					});
				}
			}, 1000);
		}
	},

	stopAudioMonitor: function() {
		clearInterval(this.audioMonitor);
	}
});

var AppRouter = Backbone.Router.extend({
	routes: {
		'': 'mainView',
		'place/:placeId': 'placeView',
		'place/:placeId/story/:storyId': 'storyPlaceView'
	}
});






var MapLib = function() {
	this.map = null;
	this.currentBase = 'online';
	this.setBoundaries = true;

	this.markers = [];

	this.markerIcon = L.divIcon({
		className: 'marker-icon',
		iconSize: [32, 42],
		iconAnchor: [16, 36],
		popupAnchor: [0, -24]
	});
	this.audioMarkerIcon = L.divIcon({
		className: 'marker-icon audio',
		iconSize: [32, 42],
		iconAnchor: [16, 36],
		popupAnchor: [0, -24]
	});
	this.audioMarkerIconBlue = L.divIcon({
		className: 'marker-icon audio-blue',
		iconSize: [32, 42],
		iconAnchor: [16, 36],
		popupAnchor: [0, -24]
	});
	this.markerIconBlue = L.divIcon({
		className: 'marker-icon blue',
		iconSize: [32, 42],
		iconAnchor: [16, 36],
		popupAnchor: [0, -24]
	});
	this.markerIconGreen = L.divIcon({
		className: 'marker-icon green',
		iconSize: [32, 42],
		iconAnchor: [16, 36],
		popupAnchor: [0, -24]
	});
	this.locationIcon = L.divIcon({
		className: 'location-icon',
		iconSize: [28, 28],
		iconAnchor: [14, 14]
	});
	this.markerIconLores = L.icon({
		iconUrl: 'img/map-marker.png',
		iconSize: [26, 34],
		iconAnchor: [13, 26],
		popupAnchor: [0, -15]
	});

	this.maxBoundaries = {
		northEast: new L.LatLng(66.2297, -17.9365),
		southWest: new L.LatLng(65.0414, -20.5815)
	};

	this.mapCenter = new L.LatLng(65.693345, -19.470520);

	this.mapLayers = {
		online: {
			label: 'MapBox',
			layer: L.mapbox.tileLayer('traustid.gibv5cdi', {
				minZoom: 9,
				maxZoom: 13,
				unloadInvisibleTiles: false
			})
		},
		online_retina: {
			label: 'MapBox Retina',
			layer: L.mapbox.tileLayer('traustid.su12x1or', {
				minZoom: 10,
				maxZoom: 14,
				detectRetina: true,
				unloadInvisibleTiles: false
			})
		},
		_online: {
			label: 'Esri',
			layer: L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
				attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
			})
		},
		_online_retina: {
			label: 'Esri',
			layer: L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
				attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
			})
		},
		offline: {
			label: 'Iceland Offline Tiles',
			layer: L.tileLayer('istiles/{z}/{x}/{y}.png', {
				minZoom: 10,
				maxZoom: 11,
				unloadInvisibleTiles: false
			})
		}
	};

	this.createMap = function(container) {
		this.map = L.map(container, {
			center: this.mapCenter,
			zoom: 11,
			zoomControl: false,
			attributionControl: false,
			maxBounds: this.setBoundaries ? new L.LatLngBounds(this.maxBoundaries.southWest, this.maxBoundaries.northEast) : null
		});

		if (!isPhoneGap()) {
			new L.Control.Zoom({
				position: 'bottomleft'
			}).addTo(this.map);
		}

		this.map.on('popupopen', function(event) {
			$('.leaflet-map-pane .leaflet-popup-content-wrapper .leaflet-popup-content .stories a').each(function() {
				$(this).click(function() {
					app.storiesList.get($(this).attr('data-story')).set({
						place: $(this).attr('data-place')
					});
					app.viewStory(app.storiesList.get($(this).attr('data-story')));

					if (!isPhoneGap()) {
						app.appRouter.navigate('place/'+$(this).attr('data-place')+'/story/'+$(this).attr('data-story'));
					}
				});
			});
		});
/*
		L.control.attribution ({
            position: 'bottomleft'
	    }).addTo(this.map);
*/
		if (L.Browser.retina) {
			this.setBaseMap('online_retina');
		}
		else {
			this.setBaseMap('online');
		}

		this.markerLayer = new L.MarkerClusterGroup({
			showCoverageOnHover: false,
			maxClusterRadius: 40
		});

		this.map.addLayer(this.markerLayer);
	};

	this.setBaseMap = function(map) {
		this.map.removeLayer(this.mapLayers[this.currentBase].layer);
		this.map.addLayer(this.mapLayers[map].layer);
		this.currentBase = map;
	};

	this.createMarker = function(data, icon) {
		var hasAudio = _.find(this.storiesList.byPlace(data.get('id')).models, function(story) {
			return story.get('hasAudio');
		}) ? true : false;

		console.log(this.storiesList.currentList);

		var marker = L.marker([data.get('coordinates')[0], data.get('coordinates')[1]], {
			title: data.get('name'),
			id: data.get('id'),
			icon: this.storiesList.currentList == 'services' ? 
				this.markerIconGreen : 
				this.storiesList.currentList == 'sturlunga' ? 
				(hasAudio ? this.audioMarkerIconBlue : this.markerIconBlue) : 
				hasAudio ? this.audioMarkerIcon : this.markerIcon
		});
/*
		var markerContent = '<h3>' + data.get('name') + '</h3>';
		var stories = app.storiesList.byPlace(data.get('id'));

		var storiesHtml = ''
;		stories.each(function(story) {
			storiesHtml += '<a data-place="' + data.get('id') + '" data-story="' + story.get('id') + '">' + story.get('title') + '</a>';
		});
		markerContent += '<div class="stories">' + storiesHtml + '</div>';

		marker.bindPopup(markerContent);
*/
		return marker;
	};

	this.addMarkers = function(placeList, markerClick) {
		var _this = this;

		var count = 0;
		placeList.each(function(point) {
			if (point.get('coordinates')[0] != null && point.get('coordinates')[1] != null) {
				var marker = _this.createMarker(point);
				if (markerClick != undefined) {
					marker.on('click', function(event) {
						event.originalEvent.preventDefault();
						markerClick(event, this);
					});
				}
/*
				marker.on('click', function(event) {
					if (app.storiesList.byPlace(event.target.options.id).length == 1 && app.openStoryOnMarkerClick) {
//						event.originalEvent.preventDefault();
						var storyId = app.storiesList.byPlace(event.target.options.id).at(0).get('id');
						app.storiesList.get(storyId).set({
							place: event.target.options.id
						});
						app.viewStory(app.storiesList.get(storyId));
					}
				});
*/
//				if (toClusters == true) {
				if (this.app.storiesList.currentList == 'services') {
					_this.markerLayer.addLayer(marker);
				}
				else {
					_this.map.addLayer(marker);
				}
				count++;
				_this.markers.push(marker);
			}
		});

	};

	this.updateMarkerRestriction = function(center) {
//		console.log(this.storiesList.currentList);

		if (this.app.storiesList != undefined) {
			if (this.app.storiesList.currentList != 'services') {
				for (var i = 0; i<this.markers.length; i++) {
					if (this.markers[i].getLatLng().distanceTo(center) > 8000) {
						$(this.markers[i]._icon).css('opacity', 0.5);
					}
					else {
						$(this.markers[i]._icon).css('opacity', 1);
					}
				}
			}
		}
	};

	this.clearMap = function() {
		if (this.markerLayer != null) {
			this.markerLayer.clearLayers;
//			this.map.removeLayer(this.markersLayer);
		}

		for (var i = 0; i<this.markers.length; i++) {
			this.markerLayer.removeLayer(this.markers[i]);
			this.map.removeLayer(this.markers[i]);
		}

		this.markers = [];
	};
};







var App = function() {
	this.networkstatus = '';
	this.currentView = 'introView';
	this.waitForBackButton = false;
	this.currentLocation = null;
	this.restrictMarkers = !isPhoneGap() ? false : true;

	// Options
	this.openStoryOnMarkerClick = false;

	this.initialize = function() {
		this.bindEvents();
	};

	this.bindEvents = function() {
		var _this = this;
		
		document.addEventListener('deviceready', function() {
			_this.onDeviceReady(_this);
		}, false);
		
		document.addEventListener('offline', function() {
			_this.networkstatus = 'offline';
			_this.mapLib.setBaseMap('offline');
			if (_this.mapLib.map.getZoom() < 10) {
				_this.mapLib.map.setZoom(10);
			}
			if (_this.mapLib.map.getZoom() > 11) {
				_this.mapLib.map.setZoom(11);
			}
			_this.popupMessage('<div class="heading"><span class="is">Ekkert netsamband.</span><span class="en">No internet connection.</span></div><span class="is">Ekki er hægt að þysja inn að fullu á kortinu.</span><span class="en">It is not possible to zoom in on the map.</span>');
		});
		
		document.addEventListener('online', function() {
			_this.networkstatus = 'online';
			if (L.Browser.retina) {
				_this.mapLib.setBaseMap('online_retina');
			}
			else {
				_this.mapLib.setBaseMap('online');
			}
			_this.popupMessage('<div class="heading"><span class="is">Netsamband komið á.</span><span class="en">Internet connection established.</span></div><span class="is">Hægt er að þysja inn á kortinu.</span><span class="en">You can now zoom in on the map.</span>');
		});
		
		document.addEventListener('backbutton', function() {
			_this.onBackButton(_this);
		});
	};
	
	this.onDeviceReady = function(_this) {
		if (isPhoneGap()) {		
			if (localStorage.getItem('lang') != null) {
				$('#splash .lang-select').css('display', 'none');

				window.appLanguage = localStorage.getItem('lang');
				$(document.body).addClass('lang-'+localStorage.getItem('lang'));
			}
		}

		_this.mapLib = new MapLib();
		_this.mapLib.createMap('mapContainer');
		_this.mapLib.app = _this;
		
		_this.types = new Types();


		if (_this.restrictMarkers) {
			_this.getLocation(_this);
			_this.watchLocation(_this);
		}		

		_this.storiesList = new StoriesList();
		_this.mapLib.storiesList = _this.storiesList;
		_this.storiesList.on('reset', function() {
			_this.mapCollection = new MapCollection();
			_this.mapCollection.on('reset', function() {
				_this.mapLib.clearMap();
				_this.mapLib.addMarkers(_this.mapCollection, function(event, _thisMarker) {
					_this.markerClick(_this, event, _thisMarker);
				});

				if (_this.currentLocation != undefined) {
	//				_this.mapLib.updateMarkerRestriction(_this.currentLocation);
				}
				if (!isPhoneGap()) {
					setTimeout(function() {
						_this.appRouter = new AppRouter();
						_this.appRouter.on('route:mainView', function() {
							if (_this.currentView != 'introView') {
								_this.closeViews();
							}
						});
						_this.appRouter.on('route:placeView', function(placeId) {

						});
						_this.appRouter.on('route:storyPlaceView', function(placeId, storyId) {
							_this.storiesList.get(storyId).set({
								place: placeId
							});
							_this.viewStory(_this.storiesList.get(storyId));
						});
						Backbone.history.start();					
					}, 1000);
				}

			});

			_this.placeList = new PlaceList();
			_this.placeList.on('reset', function() {
				_this.mapCollection.reset(_this.placeList.getPopulated().models);
			});

			if (_this.storiesList.intro != undefined) {
				_this.viewStory(new StoryInfo(_this.storiesList.intro));
			}
		});
		_this.storiesList.loadData('stories');

		_this.soundManager = new SoundManager();

		_this.storyView = new StoryView({
			el: $("#storyViewContainer")
		});
		_this.storyView.on('headerClick', function() {
			_this.closeViews();
		});
		_this.storyView.on('render', function() {
			if (_this.storyView.model.get('hasAudio') == 'true') {
				$('#storyView').addClass('small-toolbar');
			}
			else {
				$('#storyView').removeClass('small-toolbar');
			}
		});
		_this.storyView.on('playClick', function() {
			if (!hasAudio()) {
				if (_this.networkstatus == 'online') {
					if (_this.soundManager.media != null) {
						if (_this.soundManager.mediaStatus == Media.MEDIA_PAUSED) {
							_this.soundManager.play();
						}
						else {
							_this.soundManager.pause();
						}
					}
				}
				else {
					_this.popupMessage('<div class="heading"><span class="is">Ekkert netsamband.</span><span class="en">No internet connection</span></div><span class="is">Ekki er hægt að hlusta á upptökur.</span><span class="en">It is not possible to listen to audio recordings.</span>');
				}
			}
			else {
				if (_this.soundManager.media != null) {
					if (isPhoneGap()) {					
						if (_this.networkstatus == 'online') {
							if (_this.soundManager.mediaStatus == 3) {
								_this.soundManager.play();
							}
							else {
								_this.soundManager.pause();
							}
						}
						else {
							_this.popupMessage('<div class="heading"><span class="is">Ekkert netsamband.</span><span class="en">No internet connection</span></div><span class="is">Ekki er hægt að hlusta á upptökur.</span><span class="en">It is not possible to listen to audio recordings.</span>');
						}
					}
					else {
						if (_this.soundManager.mediaStatus == 3) {
							_this.soundManager.play();
						}
						else {
							_this.soundManager.pause();
						}
					}
				}
			}
		});
		_this.storyView.on('viewAudio', function() {
			if (_this.networkstatus != 'online' && (isPhoneGap())) {
				_this.popupMessage('<div class="heading">Ekkert netsamband.</div>Ekki er hægt að hlusta á upptökur.');
			}
			else {
				if (_this.soundManager.media != null && _this.soundManager.get('soundId') == _this.storyView.model.get('id')) {
					_this.soundManager.play();
				}
				else {
					_this.soundManager.loadSound(_this.storyView.model.get('id'), true);
				}
			}
		});

		_this.soundManager.on('mediaStatus', function() {
			if (_this.soundManager.mediaStatus == 4) {
				$('#audio-control').removeClass('visible');
			}
			if (_this.soundManager.mediaStatus == 3) {
				$('.audio-play-button').removeClass('playing');
			}
			if (_this.soundManager.mediaStatus == 2) {
				$('.audio-play-button').addClass('playing');
			}
		});
		_this.soundManager.on('audioMonitor', function(monitorData) {
			$('.audio-time-display').text(formatMinSec(monitorData.posMinutes)+':'+formatMinSec(monitorData.posSeconds)+' / '+formatMinSec(monitorData.durMinutes)+':'+formatMinSec(monitorData.durSeconds));

			var knobPosition = $('.audio-position').width() / (monitorData.duration / monitorData.position);
			$('.audio-position .knob').css('left', knobPosition);
		});
		_this.soundManager.on('loadSound', function() {
			$('.audio-name-display').text(_this.storiesList.get(_this.soundManager.get('soundId')).get('title'));
		});

		$('#audio-control').click(function() {
			_this.setView('storyView');
			_this.storyView.viewStory(_this.storiesList.get(_this.soundManager.get('soundId')));
			_this.storyView.viewAudio();
		});

		_this.placeView = new PlaceView({
			el: $("#placeViewContainer"),
			model: new Backbone.Model({
				placeName: '',
				stories: []
			})
		});
		_this.placeView.on('itemClick', function(event) {
			_this.storiesList.get(event.storyId).set({
				place: event.placeId
			});
			_this.viewStory(_this.storiesList.get(event.storyId));
		});

		$('#audio-control .audio-play-button').click(function(event) {
			console.log('audio-play-button:click');
			console.log(_this.soundManager.mediaStatus);
			event.stopPropagation();
			if (_this.soundManager.media != null) {
				if (_this.soundManager.mediaStatus == 2) {
					_this.soundManager.pause();
				}
				else {
					_this.soundManager.play();
				}
			}
		});

		_this.storyTypesView = new StoryTypesView({
			el: $('#storyTypesContainer'),
			collection: _this.types
		});
		_this.storyTypesView.on('render', function() {
			$('#menu ul li a').each(function() {
				$(this).click(function() {
					var action = $(this).attr('rel');
					$('#menu ul li a').removeClass('selected');
					$(this).addClass('selected');
					if ($(this).hasClass('type')) {
						if (_this.storiesList.currentList == 'sturlunga') {
							_this.storiesList.loadData('stories');
							$('#menu ul li a[rel=all]').addClass('selected');
						}
						else {
							if ($(this).attr('rel') == 'all') {
								_this.storiesList.loadData('stories');
								_this.mapCollection.reset(_this.placeList.models);
							}
							else {
//								_this.storiesList.loadData('stories');
								_this.mapCollection.reset(_this.placeList.byType($(this).attr('rel')).models);
							}
						}
						_this.closeViews();
					}
					else {
						switch(action) {
							case 'front':
								_this.setView('introView');
								break;
							case 'legends':
								_this.storiesList.loadData('stories');
//								$('#menu ul li a[rel=all]').addClass('selected');
								$('#legendsSubMenu').toggleClass('open');
								break;
							case 'sturlunga':
								_this.storiesList.loadData('sturlunga');
								break;
							case 'services':
								_this.storiesList.loadData('services');
								break;
							case 'hiking':
								_this.storiesList.loadData('hiking');
								break;
							case 'about':
								_this.setView('aboutView');
								break;
							case 'language':
								if ($(this).hasClass('lang-is')) {
									window.appLanguage = 'is';
								}
								if ($(this).hasClass('lang-en')) {
									window.appLanguage = 'en';
								}

								localStorage.setItem('lang', window.appLanguage);

								$(document.body).removeClass('lang-is');
								$(document.body).removeClass('lang-en');
								$(document.body).addClass('lang-'+window.appLanguage);

								_this.onDeviceReady();
								_this.menuOut();

								break;
						}
					}

					if (action != 'legends') {
						_this.menuOut();
					}
				});
			});
		});
		
		FastClick.attach(document.body);

		$('#viewTextButton').click(function(event) {
			$('#storyView .toolbar a').removeClass('selected');
			$('#viewTextButton').addClass('selected');
			_this.storyView.viewText();
		});

		$('#viewAudioButton').click(function(event) {
			$('#storyView .toolbar a').removeClass('selected');
			$('#viewAudioButton').addClass('selected');
			_this.storyView.viewAudio();
		});

		$('#hamburger, #labelLogo').click(function() {
			if (_this.menuVisible()) {
				_this.menuOut();
			}
			else {
				_this.menuIn();
			}
		});

		$('#btnLogo').click(function() {
			_this.setView('introView');
		});

		$('#btnLocation').click(function() {
			_this.getLocation(_this);
		});

		$('#btnOpenMap, #btnClosePanel').click(function() {
			_this.closeViews();
		});

		$('#btnViewServices').click(function() {
			_this.closeViews();
			_this.storiesList.loadData('services');
		});

		$('html').click(function(event) {
        	this.waitforBackButton = false;
		});

		$('#menuOverlay').click(function(event) {
        	_this.menuOut();
		});

		$('#menu').on('swipeleft', function(event) {
        	_this.menuOut();
		});

		$('.content-panel').each(function() {
			var contentPanel = $(this);
			contentPanel.on('swiperight', function(event) {
				_this.closeView(contentPanel.attr('id'));
			});
		});

		if (isPhoneGap()) {
			if (localStorage.getItem('lang') != null) {
				setTimeout(function() {
					$('#splash').fadeOut();
				}, 2200);
			}
			else {
				$('#splash .lang-select a').each(function() {
					$(this).click(function() {
						if ($(this).attr('rel') == 'is') {
							window.appLanguage = 'is';
						}
						if ($(this).attr('rel') == 'en') {
							window.appLanguage = 'en';
						}

						localStorage.setItem('lang', window.appLanguage);

						$(document.body).removeClass('lang-is');
						$(document.body).removeClass('lang-en');
						$(document.body).addClass('lang-'+window.appLanguage);

						_this.storiesList.loadData('stories');

						$('#splash').fadeOut();
					});
				});			
			}			
		}
		else {
			$('#splash').hide();
			$(document.body).addClass('lang-is');
			$(document.body).addClass('app-desktop');
		}
	};

	this.onBackButton = function(_this) {
		if (_this.menuVisible()) {
    		_this.menuOut();
    	}
		else if (_this.viewVisible('storyView')) {
    		_this.closeView('storyView');
    	}
    	else if (_this.viewVisible('introView')) {
    		_this.closeView('introView');
    	}
    	else if (!_this.waitforBackButton) {
    		_this.waitforBackButton = true;
    	}
    	else if (_this.waitforBackButton) {
    		navigator.app.exitApp();
    	}
	};

	this.getLocation = function(_this) {
		navigator.geolocation.getCurrentPosition(function(position) {
			_this.currentLocation = new L.LatLng(position.coords.latitude, position.coords.longitude);
			_this.mapLib.map.panTo(_this.currentLocation);

			_this.updateLocationMarker(_this);
		});

//		_this.mapLib.updateMarkerRestriction(_this.currentLocation);
	};
	
	this.watchLocation = function(_this) {
		navigator.geolocation.watchPosition(function(position) {
			_this.currentLocation = new L.LatLng(position.coords.latitude, position.coords.longitude);

			_this.updateLocationMarker(_this);

//			_this.mapLib.updateMarkerRestriction(_this.currentLocation);
		},
		function() {
			_this.restrictMarkers = false;
			_this.currentLocation = null;
		});
	};

	this.updateLocationMarker = function(_this) {
		
		if (_this.locationMarker == undefined) {
			_this.locationMarker = L.marker([0, 0], {
				title: 'Þín staðsetning',
				icon: _this.mapLib.locationIcon
			});
			_this.locationMarker.addTo(_this.mapLib.map);
		}

		_this.locationMarker.setLatLng(_this.currentLocation);
	},
	
	this.markerClick = function(_this, event, _thisMarker) {
/*
		if (this.currentLocation != null && this.storiesList.currentList != 'services') {
			var distance = _thisMarker.getLatLng().distanceTo(this.currentLocation);

			if (distance > 8000) {
				return;
			}
		}
*/
		if (this.storiesList.currentList == 'services' || this.storiesList.currentList == 'hiking') {
			var markerId = event.target.options.id;
			this.viewStory(this.storiesList.byPlace(markerId).at(0));
		}
		else if (this.storiesList.byPlace(event.target.options.id).length > 8) {
			var markerId = event.target.options.id;
			this.placeView.model.set({
				placeName: this.placeList.get(markerId).get('name'),
				placeId: markerId,
				stories: this.storiesList.byPlace(markerId).models
			});
			this.setView('placeView');

			_this.mapLib.map.openPopup('<h3>' + this.placeList.get(markerId).get('name') + '</h3>', _thisMarker.getLatLng(), {
				offset: L.point(1, -14)
			});
		}
		else {
			var markerId = event.target.options.id;
			var placeModel = this.placeList.get(markerId);
			var popupContent = '<h3>' + placeModel.get('name') + '</h3>';
			var stories = this.storiesList.byPlace(placeModel.get('id'));

			var storiesHtml = '';
			stories.each(function(story) {
				console.log(story);
				storiesHtml += '<a class="'+(story.get('hasAudio') ? 'has-audio' : '')+'" data-place="' + placeModel.get('id') + '" data-story="' + story.get('id') + '">' + story.get('title') + '</a>';
			});
			popupContent += '<div class="stories">' + storiesHtml + '</div>';

			_this.mapLib.map.openPopup(popupContent, _thisMarker.getLatLng(), {
				offset: L.point(1, -14)
			});
		}
	};

	this.checkAudioPlaying = function() {
		if (this.soundManager.mediaStatus == 2) {
			$('#audio-control').addClass('visible');
		}
	};

	this.setView = function(viewName) {
		$('#labelLogo').removeClass('visible');
		$('.content-panel:not(#' + viewName + ')').removeClass('visible');
		$('.content-panel#' + viewName).addClass('visible');
		if (viewName == 'storyView') {
			$('#audio-control').removeClass('visible');
		}
	};
	
	this.closeView = function(viewName) {
		$('.content-panel#' + viewName).removeClass('visible');
		if (!this.viewsVisible()) {
			$('#labelLogo').addClass('visible');
		}
		this.checkAudioPlaying();
	};

	this.closeViews = function() {
		if (!isPhoneGap()) {
			this.appRouter.navigate('');
		}
		$('#labelLogo').addClass('visible');
		$('.content-panel').removeClass('visible');
		this.checkAudioPlaying();
	};
	
	this.viewVisible = function(viewName) {
		return $('.content-panel#' + viewName).hasClass('visible');
	};

	this.viewsVisible = function() {
		return $('.content-pane').hasClass('visible');
    };

	this.menuIn = function() {
		$('#legendsSubMenu').removeClass('open');
		$('#menu').addClass('visible');
		$('#menuOverlay').css('display', 'block');
	};

	this.menuOut = function() {
		$('#menu').removeClass('visible');
		$('#menuOverlay').css('display', 'none');
	};

	this.menuVisible = function() {
		return $('#menu').hasClass('visible');
	};

	this.viewStory = function(story) {
		this.setView('storyView');
		this.storyView.viewStory(story);
		if (story.get('hasAudio') == 'true') {
			if ($('#viewAudioButton').hasClass('selected')) {
				this.storyView.viewAudio();
			}
		}
		else {
			this.storyView.viewText();
		}
	};

	this.timerId = -1;

	this.popupMessage = function(message) {
		var _this = this;

		var displayMessage = function() {
			var messageContainer = $('<div class="content"><div class="message">'+message+'</div></div>');
			$('#msgOverlay').hide();
			$('#msgOverlay').append(messageContainer);
			$('#msgOverlay').fadeIn();
			messageContainer.click(function() {
				$('#msgOverlay').fadeOut(function() {
					$('#msgOverlay').html('');
				});
			});
			_this.timerId = setTimeout(function() {
				$('#msgOverlay').fadeOut(function() {
					$('#msgOverlay').html('');
				});
				_this.timerId = -1;
			}, 5000);
		}

		if (_this.timerId != -1) {
			clearTimeout(_this.timerId);
			$('#msgOverlay').fadeOut(function() {
				$('#msgOverlay').html('');
				displayMessage();
			});
		}
		else {
			displayMessage();
		}
	};
};

function formatMinSec(t) {
	var s = String(Math.round(t));
	return s.length == 1 ? '0'+s: s;
}
