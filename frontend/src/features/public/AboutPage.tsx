import { Link } from "react-router-dom";
import { CarbonIcon } from "../../components/CarbonIcon";

export function AboutPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 lg:px-6 lg:py-16">
      <h1 className="text-expressive-04 text-text-primary">About Us</h1>
      <p className="mt-4 text-expressive-01 text-text-secondary max-w-3xl">
        The Developers' Club and Student Council work together to create a vibrant community of
        student leaders and innovators. We organize events, manage resources, and represent the
        student body.
      </p>

      <div className="mt-12 grid gap-8 md:grid-cols-2">
        <section className="border border-border-subtle bg-surface p-6">
          <CarbonIcon name="Group" size={32} className="text-carbon-blue-60" aria-hidden="true" />
          <h2 className="mt-4 text-expressive-02 font-semibold text-text-primary">Our Mission</h2>
          <p className="mt-2 text-productive-02 text-text-secondary">
            To foster a collaborative environment where students can develop technical skills,
            leadership abilities, and meaningful connections that last beyond their school years.
          </p>
        </section>

        <section className="border border-border-subtle bg-surface p-6">
          <CarbonIcon name="Launch" size={32} className="text-carbon-blue-60" aria-hidden="true" />
          <h2 className="mt-4 text-expressive-02 font-semibold text-text-primary">Our Vision</h2>
          <p className="mt-2 text-productive-02 text-text-secondary">
            A school community where every student has the opportunity to explore technology,
            develop as a leader, and contribute to meaningful projects.
          </p>
        </section>
      </div>

      <section className="mt-16">
        <h2 className="text-expressive-03 text-text-primary">Leadership Structure</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              role: "Teacher Advisor",
              desc: "Provides guidance, oversight, and institutional knowledge.",
            },
            {
              role: "President",
              desc: "Leads the organization, sets vision, and represents externally.",
            },
            {
              role: "Vice President",
              desc: "Supports the President and oversees day-to-day operations.",
            },
            {
              role: "Secretary",
              desc: "Manages communications, meeting minutes, and documentation.",
            },
            { role: "Treasurer", desc: "Oversees budget, finances, and funding proposals." },
            { role: "Event Coordinator", desc: "Plans and executes events, manages volunteers." },
          ].map((item) => (
            <div key={item.role} className="border-l-2 border-carbon-blue-60 bg-surface p-4">
              <h3 className="text-productive-03 font-semibold text-text-primary">{item.role}</h3>
              <p className="mt-1 text-sm text-text-secondary">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16 border-t border-border-subtle pt-12">
        <h2 className="text-expressive-03 text-text-primary">Interested in Joining?</h2>
        <p className="mt-4 text-expressive-01 text-text-secondary max-w-2xl">
          We welcome all students regardless of experience level. Whether you want to learn to code,
          organize events, or develop leadership skills, there's a place for you.
        </p>
        <Link
          to="/admin"
          className="mt-6 inline-flex items-center gap-2 bg-carbon-blue-60 px-5 py-3 text-sm font-medium text-white hover:bg-carbon-blue-70 transition-colors"
        >
          Access Member Portal
          <CarbonIcon name="ArrowRight" size={16} aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}
