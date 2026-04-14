
import { useState } from 'react';
// @ts-ignore - katex types may not be perfect for ESM
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { IdealGasLaw } from "./blocks/IdealGasLaw";
import { PythagoreanTheorem } from "./blocks/PythagoreanTheorem";
import { QuadraticFormula } from "./blocks/QuadraticFormula";
import { CircleArea } from "./blocks/CircleArea";
import { CylinderVolume } from "./blocks/CylinderVolume";
import { Integral } from "./blocks/Integral";
import { MathBlockType } from "@/lib/visualBlocks/detector";
import { MathBlockContainer } from "./MathBlockContainer";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, Calculator, Shapes, FlaskConical, Sigma } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

type Category = 'All' | 'Geometry' | 'Algebra' | 'Calculus' | 'Science';

interface VisualExample {
  type: MathBlockType;
  title: string;
  latex: string;
  component: React.ComponentType<any>;
  category: Category;
  description: string;
}

export function VisualBlockGallery() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('All');

  const examples: VisualExample[] = [
    {
      type: MathBlockType.PV_NRT_EQUATION,
      title: "Ideal Gas Law",
      latex: "PV = nRT",
      component: IdealGasLaw,
      category: 'Science',
      description: "Interactive gas cylinder visualizing relationship between Pressure, Volume, and Temperature."
    },
    {
      type: MathBlockType.PYTHAGOREAN_THEOREM,
      title: "Pythagorean Theorem",
      latex: "a^2 + b^2 = c^2",
      component: PythagoreanTheorem,
      category: 'Geometry',
      description: "Visual proof showing relationship between sides of a right triangle."
    },
    {
      type: MathBlockType.QUADRATIC_FORMULA,
      title: "Quadratic Formula",
      latex: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",
      component: QuadraticFormula,
      category: 'Algebra',
      description: "Parabola visualization showing roots and vertex dynamically."
    },
    {
      type: MathBlockType.CIRCLE_AREA,
      title: "Area of a Circle",
      latex: "A = \\pi r^2",
      component: CircleArea,
      category: 'Geometry',
      description: "Interactive circle demonstrating area vs circumference."
    },
    {
      type: MathBlockType.CYLINDER_VOLUME,
      title: "Volume of a Cylinder",
      latex: "V = \\pi r^2 h",
      component: CylinderVolume,
      category: 'Geometry',
      description: "3D cylinder visualization for volume calculation."
    },
    {
      type: MathBlockType.INTEGRAL,
      title: "Definite Integral",
      latex: "\\int_{a}^{b} x^2 dx",
      component: Integral,
      category: 'Calculus',
      description: "Area under the curve visualization with adjustable bounds."
    },
  ];

  const filteredExamples = examples.filter(ex => {
    const matchesCategory = activeCategory === 'All' || ex.category === activeCategory;
    const matchesSearch = ex.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ex.latex.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as Category)} className="w-full md:w-auto">
          <TabsList className="grid grid-cols-2 md:inline-flex w-full md:w-auto h-auto p-1">
            <TabsTrigger value="All" className="gap-2">All</TabsTrigger>
            <TabsTrigger value="Geometry" className="gap-2"><Shapes className="w-4 h-4" /> Geometry</TabsTrigger>
            <TabsTrigger value="Algebra" className="gap-2"><Calculator className="w-4 h-4" /> Algebra</TabsTrigger>
            <TabsTrigger value="Calculus" className="gap-2"><Sigma className="w-4 h-4" /> Calculus</TabsTrigger>
            <TabsTrigger value="Science" className="gap-2"><FlaskConical className="w-4 h-4" /> Science</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search blocks..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      {filteredExamples.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredExamples.map((ex) => (
            <div key={ex.type} className="flex flex-col h-[600px]">
              <MathBlockContainer
                type={ex.type}
                latex={ex.latex}
                className="flex-1 flex flex-col min-h-0"
              >
                <div className="flex-1 overflow-y-auto min-h-0">
                  <ex.component
                    latex={ex.latex}
                    initialVariables={{}}
                    fallback={
                      <div
                        className="katex-display"
                        dangerouslySetInnerHTML={{
                          __html: katex.renderToString(ex.latex, {
                            displayMode: true,
                            throwOnError: false,
                          })
                        }}
                      />
                    }
                  />
                </div>
              </MathBlockContainer>
              <div className="mt-2 px-1 shrink-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm">{ex.title}</h4>
                  <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                    {ex.category}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{ex.description}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
          <p>No blocks found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}
