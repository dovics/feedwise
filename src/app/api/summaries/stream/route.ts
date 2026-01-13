import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOpenAIConfig } from "@/lib/openai-categorizer";
import { getUserSummaryLanguage } from "@/lib/summary-generator";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SummaryItem {
  title: string;
  link?: string;
  description?: string;
  pubDate: Date;
  feedTitle: string;
  tags: string[];
}

interface GroupedItems {
  [tag: string]: SummaryItem[];
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  // Create a streaming response
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', data: 'Unauthorized' })}\n\n`));
          controller.close();
          return;
        }

        // Send start event
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start' })}\n\n`));

        // Get OpenAI config
        const config = await getOpenAIConfig();

        if (!config) {
          const errorMsg = "未配置 OpenAI API，请在管理员设置中配置";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', data: errorMsg })}\n\n`));
          controller.close();
          return;
        }

        // Get user's language preference
        const language = await getUserSummaryLanguage(session.user.id);

        // Calculate 24 hours ago
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // Fetch items
        const items = await prisma.item.findMany({
          where: {
            read: false,
            pubDate: {
              gte: twentyFourHoursAgo
            },
            feed: {
              userId: session.user.id
            }
          },
          include: {
            feed: {
              select: {
                title: true,
                tags: true
              }
            }
          },
          orderBy: {
            pubDate: "desc"
          },
          take: 100
        });

        if (items.length === 0) {
          const errorMsg = language === "zh"
            ? "过去24小时内没有未读文章"
            : "No unread articles in the last 24 hours";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', data: errorMsg })}\n\n`));
          controller.close();
          return;
        }

        // Group items by tags
        const grouped: GroupedItems = {};
        const untagged: SummaryItem[] = [];

        items.forEach((item) => {
          const summaryItem: SummaryItem = {
            title: item.title,
            link: item.link || undefined,
            description: item.description ? (item.description.length > 200 ? item.description.substring(0, 200) + "..." : item.description) : undefined,
            pubDate: item.pubDate || new Date(),
            feedTitle: item.feed.title || "Untitled Feed",
            tags: item.feed.tags
          };

          const tags = item.feed.tags || [];
          if (tags.length > 0) {
            tags.forEach((tag) => {
              if (!grouped[tag]) {
                grouped[tag] = [];
              }
              grouped[tag].push(summaryItem);
            });
          } else {
            untagged.push(summaryItem);
          }
        });

        // Format grouped items for the prompt
        let groupedText = "";
        const sortedTags = Object.keys(grouped).sort();

        sortedTags.forEach((tag) => {
          groupedText += `\n## ${tag}\n`;
          grouped[tag].slice(0, 5).forEach((item, index) => {
            groupedText += `${index + 1}. ${item.title}`;
            if (item.description) {
              groupedText += `\n   ${item.description}`;
            }
            groupedText += "\n";
          });
        });

        if (untagged.length > 0) {
          groupedText += "\n## 其他\n";
          untagged.slice(0, 5).forEach((item, index) => {
            groupedText += `${index + 1}. ${item.title}\n`;
          });
        }

        // Create the prompt
        const systemPrompt = language === "zh"
          ? "你是一个专业的新闻摘要助手。你的任务是分析过去24小时内的未读文章，生成简洁、有条理的每日摘要。摘要应该突出重点，帮助用户快速了解重要信息。使用markdown格式输出。"
          : "You are a professional news summarization assistant. Your task is to analyze unread articles from the last 24 hours and generate a concise, well-organized daily summary. The summary should highlight key points and help users quickly understand important information. Use markdown format.";

        const userPrompt = language === "zh"
          ? `请基于以下过去24小时的未读文章生成今日摘要：

${groupedText}

请按以下格式生成摘要：

## 今日要点
列出3-5个最重要的新闻或趋势

## 分类摘要
按分类简要总结各领域的主要动态

## 值得关注
推荐3-5篇特别值得阅读的文章及其理由

保持简洁，每部分控制在2-3句话。使用markdown格式。`
          : `Please generate a daily summary based on the following unread articles from the last 24 hours:

${groupedText}

Please format the summary as follows:

## Today's Highlights
List 3-5 most important news or trends

## Category Summaries
Briefly summarize key developments in each category

## Worth Reading
Recommend 3-5 articles that are particularly worth reading with reasons

Keep it concise, limit each section to 2-3 sentences. Use markdown format.`;

        // Call OpenAI API with streaming
        const response = await fetch(`${config.baseURL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${config.apiKey}`
          },
          body: JSON.stringify({
            model: config.model,
            messages: [
              {
                role: "system",
                content: systemPrompt
              },
              {
                role: "user",
                content: userPrompt
              }
            ],
            temperature: 0.5,
            max_tokens: 1000,
            stream: true
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("OpenAI API error:", response.status, errorText);
          const errorMsg = language === "zh"
            ? "生成摘要时发生错误"
            : "Error occurred while generating summary";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', data: errorMsg })}\n\n`));
          controller.close();
          return;
        }

        // Stream the response
        const reader = response.body?.getReader();
        if (!reader) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', data: 'No response body' })}\n\n`));
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              const data = trimmed.slice(6);
              if (data === '[DONE]') {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
                controller.close();
                return;
              }

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'token', data: content })}\n\n`));
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }

        // Save to database after streaming is complete
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get the full content from the buffered tokens
        // Note: In a real implementation, you'd want to collect all tokens
        // For now, we'll let the client handle displaying and we can save separately

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', itemCount: items.length })}\n\n`));
        controller.close();

      } catch (error) {
        console.error("Streaming error:", error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', data: 'Streaming error occurred' })}\n\n`));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
