import * as fs from "fs";
import * as path from "path";
import { expect } from "chai";
import { parse } from "yaml";

const CONFIG_PATH = path.resolve(__dirname, "config.yml");

interface CircleCIConfig {
  version: number;
  orbs?: Record<string, string>;
  jobs?: Record<string, CircleCIJob>;
  workflows?: Record<string, CircleCIWorkflow>;
}

interface CircleCIJob {
  docker?: Array<{ image: string }>;
  steps?: Array<string | Record<string, unknown>>;
}

interface CircleCIWorkflow {
  jobs?: Array<string | Record<string, unknown>>;
}

describe(".circleci/config.yml", () => {
  let rawContent: string;
  let config: CircleCIConfig;

  before(() => {
    rawContent = fs.readFileSync(CONFIG_PATH, "utf8");
    config = parse(rawContent) as CircleCIConfig;
  });

  describe("file validity", () => {
    it("should exist at the expected path", () => {
      expect(fs.existsSync(CONFIG_PATH)).to.be.true;
    });

    it("should be non-empty", () => {
      expect(rawContent.trim().length).to.be.greaterThan(0);
    });

    it("should parse as valid YAML without throwing", () => {
      expect(() => parse(rawContent)).to.not.throw();
    });

    it("should parse to a non-null object", () => {
      expect(config).to.be.an("object").and.not.be.null;
    });
  });

  describe("version", () => {
    it("should specify version 2.1", () => {
      expect(config.version).to.equal(2.1);
    });

    it("should not use the legacy version 2.0", () => {
      expect(config.version).to.not.equal(2.0);
    });
  });

  describe("orbs", () => {
    it("should define an orbs section", () => {
      expect(config.orbs).to.be.an("object");
    });

    it("should include the ruby orb", () => {
      expect(config.orbs).to.have.property("ruby");
    });

    it("should pin the ruby orb to circleci/ruby@2.1.1", () => {
      expect(config.orbs!.ruby).to.equal("circleci/ruby@2.1.1");
    });
  });

  describe("jobs", () => {
    it("should define a jobs section", () => {
      expect(config.jobs).to.be.an("object");
    });

    it("should define a build job", () => {
      expect(config.jobs).to.have.property("build");
    });

    describe("build job", () => {
      let buildJob: CircleCIJob;

      before(() => {
        buildJob = config.jobs!.build;
      });

      it("should use a docker executor", () => {
        expect(buildJob.docker).to.be.an("array").with.length.greaterThan(0);
      });

      it("should use the cimg/ruby:3.3 Docker image", () => {
        expect(buildJob.docker![0].image).to.equal("cimg/ruby:3.3");
      });

      it("should define steps", () => {
        expect(buildJob.steps).to.be.an("array").with.length.greaterThan(0);
      });

      it("should have exactly 3 steps", () => {
        expect(buildJob.steps).to.have.lengthOf(3);
      });

      it("should have checkout as the first step", () => {
        expect(buildJob.steps![0]).to.equal("checkout");
      });

      it("should include a run step for checking the bundler version", () => {
        const runStep = buildJob.steps!.find(
          (s) =>
            typeof s === "object" &&
            s !== null &&
            "run" in s &&
            typeof (s as Record<string, unknown>).run === "object"
        ) as Record<string, unknown> | undefined;
        expect(runStep).to.not.be.undefined;
      });

      it("should name the bundler check step 'Which bundler?'", () => {
        const runStep = buildJob.steps!.find(
          (s) =>
            typeof s === "object" &&
            s !== null &&
            "run" in s
        ) as Record<string, { name?: string; command?: string }> | undefined;
        expect(runStep).to.not.be.undefined;
        expect(runStep!.run.name).to.equal("Which bundler?");
      });

      it("should run 'bundle -v' in the bundler check step", () => {
        const runStep = buildJob.steps!.find(
          (s) =>
            typeof s === "object" &&
            s !== null &&
            "run" in s
        ) as Record<string, { name?: string; command?: string }> | undefined;
        expect(runStep).to.not.be.undefined;
        expect(runStep!.run.command).to.equal("bundle -v");
      });

      it("should include the ruby/install-deps step", () => {
        expect(buildJob.steps).to.include("ruby/install-deps");
      });

      it("should have ruby/install-deps as the last step", () => {
        const steps = buildJob.steps!;
        expect(steps[steps.length - 1]).to.equal("ruby/install-deps");
      });
    });
  });

  describe("workflows", () => {
    it("should define a workflows section", () => {
      expect(config.workflows).to.be.an("object");
    });

    it("should define a 'sample' workflow", () => {
      expect(config.workflows).to.have.property("sample");
    });

    describe("sample workflow", () => {
      let sampleWorkflow: CircleCIWorkflow;

      before(() => {
        sampleWorkflow = config.workflows!.sample;
      });

      it("should define jobs in the sample workflow", () => {
        expect(sampleWorkflow.jobs).to.be.an("array").with.length.greaterThan(0);
      });

      it("should include the build job in the workflow", () => {
        expect(sampleWorkflow.jobs).to.include("build");
      });

      it("should run exactly one job in the workflow", () => {
        expect(sampleWorkflow.jobs).to.have.lengthOf(1);
      });
    });
  });

  describe("regression and boundary checks", () => {
    it("should not reference any deprecated version 1 syntax", () => {
      expect(config.version).to.be.at.least(2);
    });

    it("should only define one job", () => {
      expect(Object.keys(config.jobs!)).to.have.lengthOf(1);
    });

    it("should only define one workflow", () => {
      expect(Object.keys(config.workflows!)).to.have.lengthOf(1);
    });

    it("should not use machine or macos executor in the build job", () => {
      const buildJob = config.jobs!.build as Record<string, unknown>;
      expect(buildJob).to.not.have.property("machine");
      expect(buildJob).to.not.have.property("macos");
    });
  });
});
