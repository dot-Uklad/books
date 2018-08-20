/**
 * @ngdoc function
 * @name drivein.controller:layoutCtrl
 * @description
 * # LayoutCtrl
 * Controller of the drivein layout. It enables bibliography and start parsing of the folders.
 * It requires bibtexparser
 */
angular.module('drivein')
  .controller('layoutCtrl', function($scope, $log, $http, $q, $routeParams, gdocParser, METADATA_FILE) {
    'use strict';

    $scope.path = '';

    $scope.title = settings.title;

    $scope.folders = [];

    $scope.docs = [];

    $scope.items = []; // will contain the item tree of the main folder. Cfr discover

    // parse bibtex and prepare bibliographical data from a bibtex string


    /*
      ##function mla
      mla parser. Should be put as service?
    */
    function mla (bibtex) {
      var bib = new BibtexParser();
      bib.setInput(bibtex);
      bib.bibtex();
      return bib;
    }

    /*
      ##function slugify
      Return a 'slug' version of a string, i-e containing a-z and 0-9 chars only.
      Spaces are replaced with '-'
    */
    function slugify(text) {
      return text.toString().toLowerCase()
        .replace(/[\s_]+/g, '-')           // Replace spaces and underscore with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
    }

    /*
      ##function cleanCSVHeaders
      given a javascript dict, clean its keys in order to be flushed into the template
    */
    function cleanCSVHeaders(d){
      var t = {};
      for(var k in d){
        t[k.replace(/\s/g, '_')] = d[k];
      }
      return t;
    }

    /*
      ##function setPath
      Set the current path, loading children via google api.
      For home page, it uses the stored res resources.
      This funciton is used when navigating sub-folders
    */
    $scope.setPath = function(candidate) {
      if(!candidate) { // go home man
        $scope.path = '';
        $scope.docs = $scope.items.filter(function(d) {
          return d.mimeType == 'application/vnd.google-apps.document';
        });
        return;
      }

      var path = $scope.folders.filter(function(d) {
        return d.slug == candidate;
      });

      if(!path.length) {
        return;
      }

      $scope.path = candidate;

      // get documents in folder.
      gapi.client.drive.files.list({
        q:  '"' + path.pop().id + '" in parents and trashed = false'
      }).execute(function(res) { // analyse folder
        if(!res.items){
          return;
        }
        // set items
        $scope.docs = res.items
          .sort(function(a, b) {
            return a.title.localeCompare(b.title);
          })
          .filter(function(d) {
            d.title = d.title.replace(/[\d\s]+/,''); // replace the very first occurrence of numbers
            d.slug = slugify(d.title || d.id);
            return d.mimeType == 'application/vnd.google-apps.document';
          });
        $scope.$apply();
      });
    };

    /*
      ##function discover
      given a starting point url (the root of our website):
      - extract the fileId
      - request its list of children from gapi
      - separate children items into folders, csv bibtext but NOT google documents. Cfr setPath for this
      - finally, transform references
      - fill the vars $scope.references, $scope.folders, $scope.docs
      @param fileid - google drive sharing link
    */
    $scope.discover = function(fileid) {
      $log.info('IC layoutCtrl >>> executing', fileid);
	  if (fileid==null) {
		  $scope.fileId = settings.sharing_link; // root folder
	  } else {
		$scope.fileId = fileid; // root folder
	  }
	  

      var request = gapi.client.drive.files.list({
        q:  '"'+ fileid + '" in parents and trashed = false'
      });

      $log.info('layoutCtrl >>> executing', fileid);
      request.execute(function(res) { // analyse folder
        var queue   = [], // queue of $http requests for each bibtext or for wach document
            references = [],
            bibtexs = [];

        $scope.folders = res.items
          .sort(function(a, b) {
            return a.title.localeCompare(b.title);
          })
          .filter(function(d) {
            // sort by title and change title for EVERY child
            d.title = d.title.replace(/[\d\s]{0,2}/,''); // replace the very first occurrence of numbers
            d.slug = slugify(d.title || d.id);
            return d.mimeType == 'application/vnd.google-apps.folder';
          });

        $scope.items = res.items;

       /* getMetadata(res)
          .then(function(metadata) {
            $scope.metadata = metadata;
          });*/

        // get reference from imported csv references
        references = res.items.filter(function(d) {
          return d.mimeType == 'text/csv' && d.title.toLowerCase().indexOf('references') != -1;
        });

        bibtexs = res.items.filter(function(d) {
          return d.mimeType == 'text/x-bibtex';
        });

        if (references.length) {
          for(var i in references) {
            queue.push(
              $http({
                url: references[i].downloadUrl,
                method: 'GET',
              /*  headers: {
                 'Authorization': 'Bearer ' + $scope.access_token
                }*/
              })
            );
          }

          $q.all(queue).then(function(responses) {
            var r = [];
            // transform csv data to js, then clean each csv header
            responses.forEach(function(d) {
              r = r.concat($.csv.toObjects(d.data).map(cleanCSVHeaders));
            });

            $scope.references = r;
            $scope.bibliography = true;
          });
        }
        $scope.$apply();
      }); // end of request execute
    };

    $scope.$on('GOOGLE_API_LOADED', function() {
		$log.info('IC layoutCtrl >>> api loaded', fileid);
      var link = settings.sharing_link.match(/id=([a-zA-Z0-9]+)/),
          fileid;
      
      $scope.setStatus(APP_STATUS_READY);
      $scope.$apply();
    });
  });
