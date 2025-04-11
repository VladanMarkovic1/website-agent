import aboutImage from '../assets/images/general-dentistry.jpg';

const features = [
  "State-of-the-art facilities",
  "Experienced dental professionals",
  "Comfortable, welcoming environment",
  "Latest dental technologies",
  "Personalized treatment plans",
  "Flexible scheduling options"
];

const About = () => {
  return (
    <section id="about" className="w-screen bg-gray-50 py-24">
      <div className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-center">
          <div className="relative">
            <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight sm:text-3xl">
              About Our Practice
            </h3>
            <p className="mt-3 text-lg text-gray-500">
              With over 20 years of experience, our team of dental professionals 
              is dedicated to providing the highest quality care in a comfortable 
              and welcoming environment.
            </p>

            <dl className="mt-10 space-y-4">
              {features.map((feature) => (
                <div key={feature} className="relative">
                  <dt>
                    <div className="absolute flex items-center justify-center h-6 w-6 rounded-md bg-primary text-white">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="ml-9 text-lg leading-6 font-medium text-gray-900">{feature}</p>
                  </dt>
                </div>
              ))}
            </dl>
          </div>

          <div className="mt-10 -mx-4 relative lg:mt-0">
            <div className="relative space-y-4">
              <div className="flex items-end justify-center lg:justify-start">
                <img
                  className="w-full rounded-lg shadow-lg"
                  src={aboutImage}
                  alt="Our dental practice"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About; 