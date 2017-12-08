import _ from 'lodash';
import moment from 'moment';
import angular from 'angular';
import {appEvents, NavModel} from 'app/core/core';
import {DashboardModel} from '../dashboard_model';

export class DashNavCtrl {
  dashboard: DashboardModel;
  navModel: NavModel;
  titleTooltip: string;

  /** @ngInject */
  constructor(
    private $scope,
    private $rootScope,
    private dashboardSrv,
    private $location,
    private backendSrv,
    public playlistSrv,
    navModelSrv) {
      this.navModel = navModelSrv.getDashboardNav(this.dashboard, this);

      appEvents.on('save-dashboard', this.saveDashboard.bind(this), $scope);
      appEvents.on('delete-dashboard', this.deleteDashboard.bind(this), $scope);

      if (this.dashboard.meta.isSnapshot) {
        var meta = this.dashboard.meta;
        this.titleTooltip = 'Created: &nbsp;' + moment(meta.created).calendar();
        if (meta.expires) {
          this.titleTooltip += '<br>Expires: &nbsp;' + moment(meta.expires).fromNow() + '<br>';
        }
      }
    }

    openSettings() {
      let search = this.$location.search();
      if (search.editview) {
        delete search.editview;
      } else {
        search.editview = 'settings';
      }
      this.$location.search(search);
    }

    starDashboard() {
      this.dashboardSrv.starDashboard(this.dashboard.id, this.dashboard.meta.isStarred)
        .then(newState => {
          this.dashboard.meta.isStarred = newState;
      });
    }

    shareDashboard(tabIndex) {
      var modalScope = this.$scope.$new();
      modalScope.tabIndex = tabIndex;
      modalScope.dashboard = this.dashboard;

      appEvents.emit('show-modal', {
        src: 'public/app/features/dashboard/partials/shareModal.html',
        scope: modalScope
      });
    }

    hideTooltip(evt) {
      angular.element(evt.currentTarget).tooltip('hide');
    }

    makeEditable() {
      this.dashboard.editable = true;

      return this.dashboardSrv.saveDashboard({makeEditable: true, overwrite: false}).then(() => {
        // force refresh whole page
        window.location.href = window.location.href;
      });
    }

    exitFullscreen() {
      this.$rootScope.appEvent('panel-change-view', {fullscreen: false, edit: false});
    }

    saveDashboard() {
      return this.dashboardSrv.saveDashboard();
    }

    deleteDashboard() {
      var confirmText = '';
      var text2 = this.dashboard.title;

      const alerts = _.sumBy(this.dashboard.panels, panel => {
         return panel.alert ? 1 : 0;
      });

      if (alerts > 0) {
        confirmText = 'DELETE';
        text2 = `This dashboard contains ${alerts} alerts. Deleting this dashboard will also delete those alerts`;
      }

      appEvents.emit('confirm-modal', {
        title: 'Delete',
        text: 'Do you want to delete this dashboard?',
        text2: text2,
        icon: 'fa-trash',
        confirmText: confirmText,
        yesText: 'Delete',
        onConfirm: () => {
          this.dashboard.meta.canSave = false;
          this.deleteDashboardConfirmed();
        }
      });
    }

    deleteDashboardConfirmed() {
      this.backendSrv.delete('/api/dashboards/db/' + this.dashboard.meta.slug).then(() => {
        appEvents.emit('alert-success', ['Dashboard Deleted', this.dashboard.title + ' has been deleted']);
        this.$location.url('/');
      });
    }

    saveDashboardAs() {
      return this.dashboardSrv.showSaveAsModal();
    }

    viewJson() {
      var clone = this.dashboard.getSaveModelClone();

      this.$rootScope.appEvent('show-json-editor', {
        object: clone,
      });
    }

    onFolderChange(folderId) {
      this.dashboard.folderId = folderId;
    }

    showSearch() {
      this.$rootScope.appEvent('show-dash-search');
    }

    addPanel() {
      if (this.dashboard.panels.length > 0 && this.dashboard.panels[0].type === 'add-panel') {
        this.dashboard.removePanel(this.dashboard.panels[0]);
        return;
      }

      this.dashboard.addPanel({
        type: 'add-panel',
        gridPos: {x: 0, y: 0, w: 12, h: 9},
        title: 'Panel Title',
      });
    }

    navItemClicked(navItem, evt) {
      if (navItem.clickHandler) {
        navItem.clickHandler();
        evt.preventDefault();
      }
    }
}

export function dashNavDirective() {
  return {
    restrict: 'E',
    templateUrl: 'public/app/features/dashboard/dashnav/dashnav.html',
    controller: DashNavCtrl,
    bindToController: true,
    controllerAs: 'ctrl',
    transclude: true,
    scope: { dashboard: "=" }
  };
}

angular.module('grafana.directives').directive('dashnav', dashNavDirective);
