import heroImage from '../assets/images/hero-dentist.jpg';

const Hero = () => {
  return (
    <section className="relative w-screen bg-white min-h-[600px] mt-16">
      <div className="absolute inset-0">
        <img
          className="w-full h-full object-cover"
          src={heroImage}
          alt="Dental professional with patient"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent"></div>
      </div>
      <div className="relative w-full">
        <div className="container mx-auto px-4 py-24 sm:px-6 lg:px-8 sm:py-32">
          <div className="md:ml-auto md:w-1/2 md:pl-10">
            <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
              <span className="block">Your Smile,</span>
              <span className="block text-primary">Our Passion</span>
            </h1>
            <p className="mt-3 text-lg text-gray-500 sm:mt-5 sm:text-xl">
              Experience exceptional dental care with our team of expert professionals.
              We're committed to giving you the healthy, beautiful smile you deserve.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#contact"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Book Appointment
              </a>
              <a
                href="#services"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-primary bg-blue-100 hover:bg-blue-200"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero; 