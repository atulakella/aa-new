"use strict";

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; })();

var achievements = [{
  age: 13,
  title: "Built my first robot",
  description: "Started my journey into robotics with a Bluetooth-controlled robotic arm, igniting my passion for technology and innovation."
}, {
  age: 15,
  title: "Developed first portfolio website",
  description: "Designed and developed my personal portfolio website, showcasing projects and featuring an interactive chatbot."
}, {
  age: 14,
  title: "Represented school at IIT Kharagpur",
  description: "Led team to finals of pan Asia Young Innovator's Program (YIP 2019), securing a top 30 position among thousands."
}, {
  age: 18,
  title: "Started professional journey",
  description: "Began as a Machine Learning Solutions Engineer at ShrimpIQ, applying ML skills to revolutionize the aquaculture industry."
}, {
  age: 18,
  title: "Won three hackathons as a college freshman",
  description: "Demonstrated creative problem-solving by winning three hackathons, including one at IIT Roorkee."
}];

function AchievementTimeline() {
  var _React$useState = React.useState(0);

  var _React$useState2 = _slicedToArray(_React$useState, 2);

  var currentIndex = _React$useState2[0];
  var setCurrentIndex = _React$useState2[1];

  var containerRef = React.useRef(null);
  var cardsRef = React.useRef(null);

  var scrollToCard = function scrollToCard(index) {
    setCurrentIndex(index);
    if (cardsRef.current) {
      var cardWidth = cardsRef.current.children[0].clientWidth;
      var scrollPosition = index * (cardWidth + 16); // 16px for gap
      cardsRef.current.style.transform = "translateX(-" + scrollPosition + "px)";
    }
  };

  var updateTimelineProgress = function updateTimelineProgress(index) {
    var progress = index / (achievements.length - 1) * 100;
    var timelineProgress = document.getElementById('timelineProgress');
    if (timelineProgress) {
      timelineProgress.style.width = progress + "%";
    }
  };

  React.useEffect(function () {
    updateTimelineProgress(currentIndex);
  }, [currentIndex]);

  return React.createElement(
    "div",
    { className: "achievement-timeline" },
    React.createElement(
      "style",
      { jsx: true },
      "\n          .achievement-timeline {\n            font-family: Arial, sans-serif;\n            width: 100%;\n            max-width: 1200px;\n            margin: 0 auto;\n            padding: 2rem;\n            box-sizing: border-box;\n          }\n          .timeline-container {\n            position: relative;\n            width: 100%;\n            overflow: hidden;\n          }\n          .cards {\n            display: flex;\n            gap: 1rem;\n            transition: transform 0.3s ease;\n          }\n          .card {\n            background-color: white;\n            border-radius: 0.5rem;\n            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);\n            padding: 1.5rem;\n            width: 300px;\n            flex-shrink: 0;\n          }\n          .card h2 {\n            color: #3b82f6;\n            margin-top: 0;\n          }\n          .card p {\n            color: #4b5563;\n            margin-bottom: 0;\n          }\n          .timeline {\n            position: relative;\n            height: 4px;\n            background-color: #e5e7eb;\n            margin-top: 2rem;\n          }\n          .timeline-progress {\n            position: absolute;\n            top: 0;\n            left: 0;\n            height: 100%;\n            background-color: #3b82f6;\n            transition: width 0.3s ease;\n          }\n          .timeline-markers {\n            display: flex;\n            justify-content: space-between;\n            margin-top: 0.5rem;\n          }\n          .timeline-marker {\n            width: 12px;\n            height: 12px;\n            background-color: #3b82f6;\n            border-radius: 50%;\n            cursor: pointer;\n            transition: transform 0.3s ease;\n          }\n          .timeline-marker:hover {\n            transform: scale(1.2);\n          }\n          .timeline-label {\n            font-size: 0.75rem;\n            color: #4b5563;\n            text-align: center;\n            margin-top: 0.25rem;\n          }\n          @media (max-width: 768px) {\n            .card {\n              width: 250px;\n            }\n          }\n        "
    ),
    React.createElement(
      "div",
      { className: "timeline-container", ref: containerRef },
      React.createElement(
        "div",
        { className: "cards", ref: cardsRef },
        achievements.map(function (achievement, index) {
          return React.createElement(
            "div",
            { key: index, className: "card" },
            React.createElement(
              "h2",
              null,
              "Age ",
              achievement.age,
              ": ",
              achievement.title
            ),
            React.createElement(
              "p",
              null,
              achievement.description
            )
          );
        })
      ),
      React.createElement(
        "div",
        { className: "timeline" },
        React.createElement("div", { className: "timeline-progress", id: "timelineProgress" })
      ),
      React.createElement(
        "div",
        { className: "timeline-markers" },
        achievements.map(function (achievement, index) {
          return React.createElement(
            "div",
            { key: index },
            React.createElement("div", {
              className: "timeline-marker",
              onClick: function () {
                return scrollToCard(index);
              }
            }),
            React.createElement(
              "div",
              { className: "timeline-label" },
              "Age ",
              achievement.age
            )
          );
        })
      )
    )
  );
}

ReactDOM.render(React.createElement(AchievementTimeline, null), document.getElementById('achievement-timeline-root'));
