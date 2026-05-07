import { Link } from "react-router-dom";
import { CarbonIcon } from "../../components/CarbonIcon";

export function PublicHome() {
  return (
    <div>
      <section className="border-b border-border-subtle bg-surface py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div className="max-w-3xl">
            <h1 className="text-expressive-05 lg:text-expressive-06 text-text-primary">
              Developers' Club &amp; Student Council
            </h1>
            <p className="mt-4 text-expressive-02 text-text-secondary max-w-2xl">
              Building a community of innovators, leaders, and creators. Explore
              our events, meet our members, and see what we've accomplished
              together.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/events"
                className="inline-flex items-center gap-2 bg-carbon-blue-60 px-5 py-3 text-sm font-medium text-white hover:bg-carbon-blue-70 transition-colors"
              >
                View Events
                <CarbonIcon name="ArrowRight" size={16} aria-hidden="true" />
              </Link>
              <Link
                to="/about"
                className="inline-flex items-center gap-2 border border-border-subtle px-5 py-3 text-sm font-medium text-text-primary hover:bg-surface-hover transition-colors"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <h2 className="text-expressive-04 text-text-primary">What We Do</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Workshops &amp; Events",
                description:
                  "Hands-on coding workshops, hackathons, and networking events that bring students together.",
                icon: "Calendar" as const,
              },
              {
                title: "Leadership Development",
                description:
                  "Opportunities to lead projects, manage teams, and develop professional skills.",
                icon: "Group" as const,
              },
              {
                title: "Community Impact",
                description:
                  "Outreach programs, mentorship, and initiatives that make a difference in our school.",
                icon: "Launch" as const,
              },
            ].map((item) => (
              <div
                key={item.title}
                className="border border-border-subtle bg-surface p-6"
              >
                <CarbonIcon
                  name={item.icon}
                  size={32}
                  className="text-carbon-blue-60"
                  aria-hidden="true"
                />
                <h3 className="mt-4 text-expressive-02 font-semibold text-text-primary">
                  {item.title}
                </h3>
                <p className="mt-2 text-productive-02 text-text-secondary">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border-subtle bg-surface py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-6 text-center">
          <h2 className="text-expressive-04 text-text-primary">
            Ready to Get Involved?
          </h2>
          <p className="mt-4 text-expressive-01 text-text-secondary max-w-xl mx-auto">
            Join our community of passionate students. Attend an event, become a
            member, or just say hello.
          </p>
          <Link
            to="/about"
            className="mt-6 inline-flex items-center gap-2 bg-carbon-blue-60 px-5 py-3 text-sm font-medium text-white hover:bg-carbon-blue-70 transition-colors"
          >
            About Our Organization
            <CarbonIcon name="ArrowRight" size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
