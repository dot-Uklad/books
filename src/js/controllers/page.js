/**
 * @ngdoc function
 * @name drivein.controller:pageCtrl
 * @description
 * # LayoutCtrl
 * Controller of static pages.
 */
angular.module('drivein')
  .controller('pageCtrl', function($scope, $log, $http, $routeParams, $route) {
    'use strict';

  var parentPathId = $route.current.originalPath.split('/').pop();
  
    $scope.$parent.path = parentPathId;

    /*
      ##eventListener $scope.app_status
      If everything is ready, load main content.
    */
    $scope.$watch('app_status', function(app_status){
      if(app_status !== APP_STATUS_READY) {
        return;
      }

      if($routeParams.folder && $scope.fileId != $routeParams.folder) {
         $log.info('IC page routeParams.folder', $routeParams.folder);
        $scope.discover($routeParams.folder);
      } else {
        $log.info('IC page sharing_link', settings.sharing_link);
        $scope.discover(settings.sharing_link);
      }
    });
  });
