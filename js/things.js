const achievements = [
    {
      age: 13,
      title: "Built my first robot",
      description: "Started my journey into robotics with a Bluetooth-controlled robotic arm, igniting my passion for technology and innovation."
    },
    {
      age: 15,
      title: "Developed first portfolio website",
      description: "Designed and developed my personal portfolio website, showcasing projects and featuring an interactive chatbot."
    },
    {
      age: 14,
      title: "Represented school at IIT Kharagpur",
      description: "Led team to finals of pan Asia Young Innovator's Program (YIP 2019), securing a top 30 position among thousands."
    },
    {
      age: 18,
      title: "Started professional journey",
      description: "Began as a Machine Learning Solutions Engineer at ShrimpIQ, applying ML skills to revolutionize the aquaculture industry."
    },
    {
      age: 18,
      title: "Won three hackathons as a college freshman",
      description: "Demonstrated creative problem-solving by winning three hackathons, including one at IIT Roorkee."
    }
  ];
  
  function AchievementTimeline() {
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const containerRef = React.useRef(null);
    const cardsRef = React.useRef(null);
  
    const scrollToCard = (index) => {
      setCurrentIndex(index);
      if (cardsRef.current) {
        const cardWidth = cardsRef.current.children[0].clientWidth;
        const scrollPosition = index * (cardWidth + 16); // 16px for gap
        cardsRef.current.style.transform = `translateX(-${scrollPosition}px)`;
      }
    };
  
    const updateTimelineProgress = (index) => {
      const progress = (index / (achievements.length - 1)) * 100;
      const timelineProgress = document.getElementById('timelineProgress');
      if (timelineProgress) {
        timelineProgress.style.width = `${progress}%`;
      }
    };
  
    React.useEffect(() => {
      updateTimelineProgress(currentIndex);
    }, [currentIndex]);
  
    return (
      <div className="achievement-timeline">
        <style jsx>{`
          .achievement-timeline {
            font-family: Arial, sans-serif;
            width: 100%;
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
            box-sizing: border-box;
          }
          .timeline-container {
            position: relative;
            width: 100%;
            overflow: hidden;
          }
          .cards {
            display: flex;
            gap: 1rem;
            transition: transform 0.3s ease;
          }
          .card {
            background-color: white;
            border-radius: 0.5rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            padding: 1.5rem;
            width: 300px;
            flex-shrink: 0;
          }
          .card h2 {
            color: #3b82f6;
            margin-top: 0;
          }
          .card p {
            color: #4b5563;
            margin-bottom: 0;
          }
          .timeline {
            position: relative;
            height: 4px;
            background-color: #e5e7eb;
            margin-top: 2rem;
          }
          .timeline-progress {
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            background-color: #3b82f6;
            transition: width 0.3s ease;
          }
          .timeline-markers {
            display: flex;
            justify-content: space-between;
            margin-top: 0.5rem;
          }
          .timeline-marker {
            width: 12px;
            height: 12px;
            background-color: #3b82f6;
            border-radius: 50%;
            cursor: pointer;
            transition: transform 0.3s ease;
          }
          .timeline-marker:hover {
            transform: scale(1.2);
          }
          .timeline-label {
            font-size: 0.75rem;
            color: #4b5563;
            text-align: center;
            margin-top: 0.25rem;
          }
          @media (max-width: 768px) {
            .card {
              width: 250px;
            }
          }
        `}</style>
        <div className="timeline-container" ref={containerRef}>
          <div className="cards" ref={cardsRef}>
            {achievements.map((achievement, index) => (
              <div key={index} className="card">
                <h2>Age {achievement.age}: {achievement.title}</h2>
                <p>{achievement.description}</p>
              </div>
            ))}
          </div>
          <div className="timeline">
            <div className="timeline-progress" id="timelineProgress"></div>
          </div>
          <div className="timeline-markers">
            {achievements.map((achievement, index) => (
              <div key={index}>
                <div
                  className="timeline-marker"
                  onClick={() => scrollToCard(index)}
                ></div>
                <div className="timeline-label">Age {achievement.age}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  ReactDOM.render(<AchievementTimeline />, document.getElementById('achievement-timeline-root'));