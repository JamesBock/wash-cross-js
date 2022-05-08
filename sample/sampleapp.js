const sampleapp = angular.module('sampleapp', []);

sampleapp.controller('MainController', function ($scope, $http) {

  let crossword = null;
  let crosswordDom = null;

  //$http.get('crosswords/guardian_quiptic_89.json').success(function(crosswordDefinition) {
  $http.get('crosswords/courtneys_crossword.json').success(function (crosswordDefinition) {

    //  Set the crossword info.
    $scope.info = crosswordDefinition.info;

    //  Create the crossword model.
    crossword = CrosswordsJS.compileCrossword(crosswordDefinition);
    crosswordDom = new CrosswordsJS.CrosswordDOM(window, crossword, document.getElementById('crossword1'));

    $scope.acrossClues = crossword.acrossClues;
    $scope.downClues = crossword.downClues;

    crosswordDom.selectClue(crossword.acrossClues[0]);
    $scope.currentClue = crossword.acrossClues[0];

    crosswordDom.onStateChanged = function (message) {

      if (message.message === "clueSelected") {
        $scope.currentClue = crosswordDom.currentClue;
        $scope.$apply();

        const selected = document.getElementsByClassName("selectedClue");
        if (selected.length > 0) {
          console.log(`offsetTop ${selected[0].offsetTop}`);
          const el = crosswordDom.currentClue.across
            ? document.getElementById('clueColumnX')
            : document.getElementById('clueColumnY');
          console.log(`el scrollTop ${el.scrollTop}`);
          console.log(selected[0]);
          // el.scrollTop = selected[0].offsetTop;
          el.scrollTo(0, selected[0].offsetTop);
          // el.scrollTo(0, selected[0].offsetTop - selected[0].offsetHeight - (selected[0].clientHeight ));
          // selected[0].scrollIntoView({
          //   behavior: 'smooth',
          //   block: 'nearest',
          //   inline: 'start'
          // });
          console.log(`el.scrolltop after ${el.scrollTop}`);
  
  
        }
      }

    };

  });

  $scope.isHighlightedClue = function (clue) {
    const currentClue = $scope.currentClue;
    const parentClue = currentClue.parentClue;

    // The trivial case is that the clue is selected.
    if (clue === currentClue) {
    
      // console.log(clue);
      return true;
    }
    //  We might also be a clue which is part of a non-linear clue.
    if (currentClue && parentClue && (parentClue === clue || parentClue.connectedClues.indexOf(clue) !== -1)) {
      return true;
    }

    return false;
  };

  $scope.selectClue = function (clue) {
    crosswordDom.selectClue(clue);
  };

});
