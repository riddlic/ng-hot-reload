class BoldDirective {
  constructor() {
    this.restrict = 'E';
    this.scope = {};
    this.transclude = true;
    this.template = `
      <div ng-transclude></div>
    `;
    this.weight = 'initial';
  }

  link(scope, $element) {
    $element.css('font-weight', this.weight);
    console.log('blaaa', $element);
  }
}

angular.module('hot-reload-demo')
    .directive('bold', () => new BoldDirective());
