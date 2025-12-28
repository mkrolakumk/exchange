from aws_cdk import Stack, Duration, aws_cloudfront as cloudfront, aws_cloudfront_origins as origins, aws_elasticloadbalancingv2 as elbv2, CfnOutput
from constructs import Construct


class CdnStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, alb: elbv2.ApplicationLoadBalancer, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        origin = origins.LoadBalancerV2Origin(
            alb,
            protocol_policy=cloudfront.OriginProtocolPolicy.HTTP_ONLY,
            http_port=80,
        )

        self.distribution = cloudfront.Distribution(
            self, "Distribution",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origin,
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                allowed_methods=cloudfront.AllowedMethods.ALLOW_ALL,
                cache_policy=cloudfront.CachePolicy.CACHING_DISABLED,
                origin_request_policy=cloudfront.OriginRequestPolicy.ALL_VIEWER,
            ),
            additional_behaviors={
                "/api/*": cloudfront.BehaviorOptions(
                    origin=origin,
                    viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    allowed_methods=cloudfront.AllowedMethods.ALLOW_ALL,
                    cache_policy=cloudfront.CachePolicy.CACHING_DISABLED,
                    origin_request_policy=cloudfront.OriginRequestPolicy.ALL_VIEWER,
                ),
            },
            price_class=cloudfront.PriceClass.PRICE_CLASS_100,
        )

        CfnOutput(self, "CloudFrontURL",
                  value=f"https://{self.distribution.distribution_domain_name}")
        CfnOutput(self, "CloudFrontDomain",
                  value=self.distribution.distribution_domain_name)
